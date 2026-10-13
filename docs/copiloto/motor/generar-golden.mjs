import fs from 'fs';
import { E, setFormatters } from './copiloto-engine.mjs';
import { casos, fmt } from './casos.mjs';
setFormatters(fmt);
const clean = o => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' && !isFinite(v) ? (v > 0 ? 'Infinity' : '-Infinity') : v)));
fs.writeFileSync(new URL('./golden.json', import.meta.url), JSON.stringify(clean(casos(E)), null, 1));
console.log('golden.json generado');
