import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { withUser } from "@/lib/db/client";
import { todayIn } from "@/lib/finance/dates";
import { formatMoney, formatPct, formatX } from "@/lib/copiloto/format";
import { EJEMPLO_COOKIE, ejemploState } from "@/lib/copiloto/ejemplo";
import {
  MENTOR_ACTIONS,
  MENTOR_LIMITE_DIARIO,
  MENTOR_SCHEMAS,
  mentorPrompt,
  type MentorAction,
} from "@/lib/copiloto/mentor";
import { productSchema, type Product } from "@/lib/copiloto/state";
import { getCurrentUser } from "@/server/session";
import { getSettings } from "@/server/services/settings";
import { loadState } from "@/server/services/copiloto";
import { mentorUsos, sumarUsoMentor } from "@/server/services/mentor";

export const dynamic = "force-dynamic";
/** El mentor piensa antes de responder: puede tardar más que una página. */
export const maxDuration = 120;

const MODEL = "claude-opus-5-5";
const formField = z.union([z.string().max(300), z.number().finite(), z.null()]);
const form = z
  .record(z.string().max(40), formField)
  .refine((o) => Object.keys(o).length <= 30);
const body = z.object({
  action: z.enum(MENTOR_ACTIONS as [MentorAction, ...MentorAction[]]),
  testForm: form.optional(),
  planForm: form.optional(),
  draft: productSchema.optional(),
});

export type MentorResponse =
  | { ok: true; data: unknown; restantes: number }
  | { ok: false; error: string; prompt?: string; restantes?: number };

const reply = (r: MentorResponse, status = 200) =>
  NextResponse.json(r, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Mentor con IA (especificación §6). El servidor arma el prompt del original con el estado guardado
 * de la persona (o el del modo ejemplo) y llama a la API de Claude; la clave nunca sale del servidor.
 * Si no hay clave o la llamada falla, devuelve el prompt para copiarlo en Claude, como el original.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return reply(
      { ok: false, error: "Inicia sesión para usar el mentor." },
      401,
    );
  let input: z.infer<typeof body>;
  try {
    const raw = await req.text();
    if (raw.length > 100_000)
      return reply({ ok: false, error: "Solicitud demasiado grande." }, 413);
    input = body.parse(JSON.parse(raw));
  } catch {
    return reply({ ok: false, error: "Solicitud no válida." }, 400);
  }
  const demo = (await cookies()).get(EJEMPLO_COOKIE)?.value === "1";
  const { S, today, usos } = await withUser(user.id, async (tx) => {
    const today = todayIn((await getSettings(tx, user.id)).timezone);
    const S = demo ? ejemploState(today) : await loadState(tx, user.id, today);
    return { S, today, usos: await mentorUsos(tx, user.id, today) };
  });
  const f = {
    money: (n: number) => formatMoney(n, { cur: S.cur, trm: S.trm }),
    pct: formatPct,
    x: formatX,
  };
  const prompt = mentorPrompt(
    input.action,
    S,
    {
      testForm: input.testForm,
      planForm: input.planForm,
      draft: input.draft as Product | undefined,
    },
    f,
  );
  const restantes = Math.max(0, MENTOR_LIMITE_DIARIO - usos);

  if (restantes <= 0)
    return reply(
      {
        ok: false,
        error: `Usaste las ${MENTOR_LIMITE_DIARIO} consultas al mentor de hoy. Mañana tienes más; mientras tanto puedes copiar el análisis para Claude.`,
        prompt,
        restantes: 0,
      },
      429,
    );
  if (!process.env.ANTHROPIC_API_KEY)
    return reply(
      {
        ok: false,
        error:
          "El mentor con IA todavía no está activado en este sitio. Puedes copiar el análisis y pegarlo en Claude.",
        prompt,
        restantes,
      },
      503,
    );

  const schema = MENTOR_SCHEMAS[input.action];
  try {
    const client = new Anthropic({ timeout: 110_000, maxRetries: 1 });
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal")
      return reply({
        ok: false,
        error:
          "El mentor no pudo responder esta consulta. Puedes copiar el análisis para Claude.",
        prompt,
        restantes,
      });
    if (response.stop_reason === "max_tokens")
      return reply({
        ok: false,
        error: "La respuesta del mentor quedó incompleta. Intenta de nuevo.",
        prompt,
        restantes,
      });
    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const parsed = schema.safeParse(
      JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)),
    );
    if (!parsed.success)
      return reply({
        ok: false,
        error:
          "La respuesta del mentor no tiene el formato esperado. Intenta de nuevo.",
        prompt,
        restantes,
      });
    const usados = await withUser(user.id, (tx) =>
      sumarUsoMentor(tx, user.id, today),
    );
    return reply({
      ok: true,
      data: parsed.data,
      restantes: Math.max(0, MENTOR_LIMITE_DIARIO - usados),
    });
  } catch (err) {
    let error =
      "No pudimos hablar con el mentor. Intenta de nuevo en un momento.";
    if (err instanceof Anthropic.RateLimitError)
      error =
        "El mentor está atendiendo muchas consultas. Intenta de nuevo en un minuto.";
    else if (
      err instanceof Anthropic.AuthenticationError ||
      err instanceof Anthropic.PermissionDeniedError
    )
      error =
        "El mentor con IA no está bien configurado en este sitio. Puedes copiar el análisis para Claude.";
    else if (err instanceof Anthropic.APIConnectionTimeoutError)
      error = "El mentor tardó demasiado. Intenta de nuevo.";
    else if (err instanceof SyntaxError)
      error = "La respuesta del mentor no se pudo leer. Intenta de nuevo.";
    if (!(err instanceof SyntaxError))
      console.error(
        "mentor",
        err instanceof Anthropic.APIError
          ? `${err.status} ${err.message}`
          : err,
      );
    return reply({ ok: false, error, prompt, restantes }, 502);
  }
}
