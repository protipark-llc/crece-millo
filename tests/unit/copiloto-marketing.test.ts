import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { activeProduct } from "@/lib/copiloto/logic";
import {
  adCopy,
  angles,
  hooks,
  launch,
  mkCtx,
  mkState,
  offerCalc,
  offers,
  pageTexts,
  scriptText,
  scripts,
  waMessages,
} from "@/lib/copiloto/marketing";
import { parseBackup } from "@/lib/copiloto/state";

const TODAY = "2026-10-13";
const S = parseBackup(
  JSON.parse(readFileSync("docs/copiloto/motor/estado-demo.json", "utf8")),
  TODAY,
);
const dir = "docs/copiloto/original/textos-con-demo/";
const txt = (f: string) => readFileSync(dir + f, "utf8");
// Formateadores del original (L624–626): con ellos los textos deben salir idénticos.
const f = {
  money: (n: number) =>
    isFinite(n)
      ? (n < 0 ? "-" : "") +
        "$" +
        Math.round(Math.abs(n)).toLocaleString("es-CO")
      : "—",
  pct: (n: number) =>
    isFinite(n)
      ? (n * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + "%"
      : "—",
  x: (n: number) => (isFinite(n) && n > 0 ? n.toFixed(2) + "×" : "—"),
};
const flat = (r: { t: string }[]) => r.map((x) => x.t).join("");

describe("Co-Piloto · Marketing: plantillas idénticas al original con la demostración", () => {
  const p = activeProduct(S);
  const c = mkCtx(p, f.money);
  const st = mkState(S.mk as Record<string, Record<string, unknown>>, p.id);

  it("ofertas: guiones y resultado en vivo", () => {
    const T = txt("07-marketing-ofertas.txt");
    for (const o of offers(c, st, f.money)) {
      expect(T).toContain(o.guion);
      expect(T).toContain(flat(offerCalc(o, p, S.risk, f).info));
    }
  });

  it("creativos: ángulos, ganchos, guiones y textos", () => {
    const T = txt("08-marketing-creativos.txt");
    for (const a of angles(c)) expect(T).toContain(a);
    for (const h of hooks(c, f.money)) expect(T).toContain(h.h);
    for (const s of scripts(c)) for (const l of s.s) expect(T).toContain(l);
    const ac = adCopy(c);
    for (const t of [...ac.prim, ...ac.head])
      for (const line of t.split("\n")) expect(T).toContain(line);
    expect(scriptText(scripts(c)[0]!)).toMatch(
      /^Problema → solución \(15–20 s\)\n1\. 0–3 s/,
    );
  });

  it("página y WhatsApp", () => {
    const T = txt("09-marketing-pagina.txt");
    const pg = pageTexts(c, f);
    expect(T).toContain(pg.tit);
    for (const b of pg.bul) expect(T).toContain(b);
    for (const [q, a] of pg.faq) {
      expect(T).toContain(q);
      expect(T).toContain(a);
    }
    for (const [t, m] of waMessages(c, S.marca, f.money)) {
      expect(T).toContain(t.toUpperCase());
      for (const line of m.split("\n").filter(Boolean))
        expect(T).toContain(line);
    }
  });

  it("plan de lanzamiento", () => {
    const T = txt("10-marketing-lanz.txt");
    const L = launch(p, S.risk, f.money);
    for (const [t, d] of L.steps) {
      expect(T).toContain(t);
      expect(T).toContain(d);
    }
    expect(T).toContain(f.money(L.diario));
  });
});
