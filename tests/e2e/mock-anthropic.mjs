// Servidor simulado de la API de Claude para las pruebas e2e del mentor (no usa red ni clave real).
// Verifica la forma de la petición y responde un JSON válido según la acción del prompt.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_ANTHROPIC_PORT || 3299);
const answers = [
  [
    /Analiza este test/,
    {
      veredicto: "Escalar con cuidado",
      diagnostico: "Diagnóstico simulado del test.",
      acciones: ["Acción 1", "Acción 2"],
      ajuste_ads: "Sube 20%.",
      foco_ux: "Mejora la página.",
      riesgo: "CPA al alza.",
      siguiente_paso: "Repite el test.",
    },
  ],
  [
    /Diseña la estrategia/,
    {
      estado: "En test",
      diagnostico: "Diagnóstico simulado.",
      estrategia: ["Uno", "Dos", "Tres"],
      creativos: "c",
      pagina_oferta: "p",
      logistica: "l",
      presupuesto: "b",
      siguiente_paso: "s",
    },
  ],
  [
    /Crea ofertas/,
    {
      upsells: [
        {
          nombre: "Upsell simulado",
          precio: "$ 39.900",
          por_que: "x",
          mensaje: "y",
        },
      ],
      downsells: [],
      cross_sells: [],
    },
  ],
  [
    /Crea creativos/,
    {
      ganchos: ["Gancho simulado"],
      guiones: [{ titulo: "Guion", duracion: "15 s", escenas: ["a"] }],
      textos: ["t"],
      titulares: ["h"],
    },
  ],
  [
    /Propón cómo desplegar capital/,
    {
      proposito: "Propósito simulado",
      propuesta_capital: "p",
      proximos_pasos: ["1", "2", "3"],
      justificacion_riesgo: "r",
      advertencia: "a",
    },
  ],
  [
    /revisión semanal/,
    {
      resumen: "Resumen simulado",
      escalar: ["x"],
      optimizar: [],
      matar: [],
      siguiente_test: "y",
      capital_semana: "z",
      foco_semana: ["1", "2", "3"],
    },
  ],
  [
    /Completa la ficha/,
    {
      nombre_corto: "Masajeador cervical",
      categoria: "Bienestar",
      publico: "Público simulado",
      beneficio: "Beneficio simulado",
      dolor: "Dolor simulado",
      angulos: ["a1", "a2", "a3", "a4", "a5"],
      objeciones: ["o1", "o2", "o3", "o4", "o5"],
      invima: "No",
      score: {
        wow: 5,
        problema: 5,
        valor: 4,
        demanda: 4,
        competencia: 3,
        envio: 3,
        recompra: 3,
        creativos: 4,
        devol: 3,
        prov: 3,
      },
    },
  ],
];

createServer(async (req, res) => {
  let raw = "";
  for await (const c of req) raw += c;
  const send = (status, obj) => {
    res.writeHead(status, {
      "content-type": "application/json",
      "request-id": "req_mock",
    });
    res.end(JSON.stringify(obj));
  };
  if (req.method !== "POST" || !req.url.startsWith("/v1/messages"))
    return send(404, {
      type: "error",
      error: { type: "not_found_error", message: "no" },
    });
  const body = JSON.parse(raw || "{}");
  const beta = String(req.headers["anthropic-beta"] || "");
  const problems = [];
  if (req.headers["x-api-key"] !== "clave-de-prueba")
    problems.push("x-api-key");
  if (body.model !== "claude-opus-5-5") problems.push("model");
  if (
    body.fallbacks !== "default" ||
    !beta.includes("server-side-fallback-2026-07-01")
  )
    problems.push("fallbacks");
  if (
    body.output_config?.format?.type !== "json_schema" ||
    body.output_config?.effort !== "medium"
  )
    problems.push("output_config");
  if (body.thinking?.type === "disabled") problems.push("thinking");
  if (problems.length)
    return send(400, {
      type: "error",
      error: {
        type: "invalid_request_error",
        message: `mock: ${problems.join(", ")}`,
      },
    });
  const prompt = body.messages?.[0]?.content ?? "";
  const hit = answers.find(([re]) => re.test(prompt));
  send(200, {
    id: "msg_mock",
    type: "message",
    role: "assistant",
    model: body.model,
    content: [{ type: "text", text: JSON.stringify(hit ? hit[1] : {}) }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  });
}).listen(PORT, () => console.log(`mock-anthropic en ${PORT}`));
