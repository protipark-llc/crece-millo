// Uso: node verificar.mjs [ruta-a-tu-motor.mjs]
// Compara tu motor (portado a TS y compilado a JS, o el original) contra golden.json.
// Tu módulo debe exportar E con las mismas funciones y setFormatters (opcional).
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { casos, fmt } from './casos.mjs';
const target = process.argv[2] ? pathToFileURL(path.resolve(process.argv[2])).href : new URL('./copiloto-engine.mjs', import.meta.url).href;
const mod = await import(target);
const E = mod.E || mod.default;
if (mod.setFormatters) mod.setFormatters(fmt);
const clean = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' && !isFinite(v) ? (v > 0 ? 'Infinity' : '-Infinity') : v)));
const got = clean(casos(E));
const want = JSON.parse(fs.readFileSync(new URL('./golden.json', import.meta.url)));
let fails = 0, checks = 0;
function cmp(a, b, p) {
  if (typeof b === 'number' && typeof a === 'number') { checks++; if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(b))) { fails++; if (fails < 30) console.log('✗', p, 'esperado', b, 'obtenido', a); } return; }
  if (b && typeof b === 'object') { for (const k of Object.keys(b)) cmp(a ? a[k] : undefined, b[k], p + '.' + k); return; }
  checks++; if (a !== b) { fails++; if (fails < 30) console.log('✗', p, 'esperado', JSON.stringify(b), 'obtenido', JSON.stringify(a)); }
}
cmp(got, want, 'E');
console.log(fails ? `✗ ${fails} diferencias de ${checks} comprobaciones` : `✓ ${checks} comprobaciones idénticas al original`);
process.exit(fails ? 1 : 0);
