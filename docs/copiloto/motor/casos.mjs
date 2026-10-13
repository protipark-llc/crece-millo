// Casos de prueba del motor. Generan las mismas entradas siempre (datos ficticios del estado de demostración).
import fs from 'fs';
const S = JSON.parse(fs.readFileSync(new URL('./estado-demo.json', import.meta.url)));
const ojos = S.products.find(p => p.id === 'ojos');
const fmt = {
  money: n => (!isFinite(n) ? '—' : (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('es-CO')),
  pct: n => (isFinite(n) ? (n * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + '%' : '—'),
};
export function casos(E) {
  const out = {};
  const risks = [1, 5, 10];
  for (const r of risks) {
    out['rules_' + r] = E.rules(r);
    out['riskProfile_' + r] = E.riskProfile(r);
    for (const p of S.products) {
      out[`unit_${p.id}`] = E.unit(p);
      out[`gate_${p.id}_${r}`] = E.gate(p, r);
      out[`evaluate_${p.id}_${r}`] = E.evaluate(p, r);
    }
  }
  const forms = [
    { ads: 420000, imp: 61000, clics: 640, ped: 9, conf: 8, ent: 6, aov: 0 },
    { ads: 510000, imp: 72000, clics: 810, ped: 13, conf: 12, ent: 10, aov: 0 },
    { ads: 650000, imp: 90000, clics: 1050, ped: 18, conf: 16, ent: 13, aov: 0 },
    { ads: 480000, imp: 64000, clics: 720, ped: 12, conf: null, ent: null, aov: 0 },
    { ads: 160000, imp: 30000, clics: 200, ped: 0, conf: null, ent: null, aov: 0 },
    { ads: 90000, imp: 20000, clics: 150, ped: 0, conf: null, ent: null, aov: 0 },
    { ads: 600000, imp: 50000, clics: 400, ped: 6, conf: 5, ent: 3, aov: 0 },
    { ads: 0, imp: 0, clics: 0, ped: 0, conf: null, ent: null, aov: 0 },
  ];
  forms.forEach((f, i) => {
    const c = E.test(f, ojos);
    out['test_' + i] = c;
    for (const r of risks) out[`verdict_${i}_${r}`] = E.verdict(c, 20, r, ojos);
  });
  const tests = S.tests;
  const a = E.agg(tests);
  out.agg = a;
  out.real = E.real(tests);
  out.diagnose_5 = E.diagnose(a, ojos, 5);
  out.diagnose_10 = E.diagnose(a, ojos, 10);
  const q = { costo: 56000, P: 179900, upPrecio: 0, upCosto: 0, upTasa: 0, cpa0: 39500, p0: 179900, elast: 1.2, techo: 195000, presupuesto: 1500000, conf: 90, entrega: 83, flete: 16000, fleteRet: 0, empaque: 1000, costoConf: 0, com: 3, imp: 0, fijosMes: 200000, margenMin: 11, margenObj: 20 };
  const R = E.pricing(q);
  out.pricing = { lo: R.lo, hi: R.hi, step: R.step, be: R.be, pMin: R.pMin, pObj: R.pObj, rec: R.rec, range: R.range, opt: R.opt.P, bestH: R.bestH && R.bestH.P, n: R.grid.length, muestra: R.grid.filter((g, i) => i % 20 === 0) };
  out.priceEval_179900 = E.priceEval(q, 179900);
  out.priceEval_249900 = E.priceEval(q, 249900);
  out.psych = [9500, 49999, 50001, 123456, 179000].map(E.psych);
  out.cpaAt = [99900, 179900, 260000].map(P => E.cpaAt(q, P));
  out.plan_5 = E.plan(S.planForm, 5);
  out.plan_1 = E.plan({ ...S.planForm, modo: 'monto', m: 3500000, N: 6 }, 1);
  const f = S.simForm, g = E.gate(ojos, 5);
  out.sim_base = E.sim({ ...ojos, cpa: f.cpa, deg: f.deg, tope: f.tope, cap: f.cap, asig: f.asig, reinv: f.reinv, fijos: f.fijos, ciclo: f.ciclo, meses: f.meses, cdt: f.cdt, testeo: g.presTest * f.ntest });
  out.sim_pesimista = E.sim({ ...ojos, entrega: ojos.entrega - 10, cpa: f.cpa * 1.25, deg: f.deg, tope: f.tope, cap: f.cap, asig: f.asig, reinv: f.reinv, fijos: f.fijos, ciclo: f.ciclo, meses: f.meses, cdt: f.cdt, testeo: g.presTest * f.ntest });
  out.sim_quiebra = E.sim({ ...ojos, cpa: 150000, deg: 20, tope: 300000, cap: 1000000, asig: 90, reinv: 90, fijos: 200000, ciclo: 10, meses: 6, cdt: 9, testeo: 0 });
  return out;
}
export { fmt };
