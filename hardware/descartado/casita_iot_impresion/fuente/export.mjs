// Orienta cada pieza para imprimir, la apoya en z = 0 y escribe STL binario. También estima el filamento.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PIEZAS } from './parts.mjs';
const aqui = (f) => new URL(f, import.meta.url);
const DEST = process.argv[2] || new URL('../stl', import.meta.url).pathname;
const ORIENT = {
  bandeja: ['ninguna', 'Piso sobre la cama', 'No'],
  tapa: ['rx180', 'Boca abajo: el jardín sobre la cama', 'No'],
  paredes: ['ninguna', 'De pie, como en la casa', 'No: dinteles de 18 a 20 mm en puente'],
  marcos: ['ninguna', 'De pie', 'No'],
  puerta: ['ninguna', 'De pie, con borde de adherencia', 'No'],
  corona: ['rx-90', 'Cara plana sobre la cama', 'No'],
  pestillo: ['rx-90', 'Acostado, alojamiento hacia arriba', 'No'],
  asiento: ['rx180', 'Placa sobre la cama, faldón arriba', 'No'],
  techo: ['ry90', 'Parado sobre un hastial', 'No'],
  nieve_techo: ['ry90', 'Parado sobre un hastial', 'No'],
  chimenea: ['rx180', 'Boca abajo, sobre su remate', 'No'],
  arbol_grande: ['ninguna', 'De pie', 'No'],
  arbol_chico: ['ninguna', 'De pie', 'No'],
  muneco: ['ninguna', 'De pie, con borde de adherencia', 'Mejor con soporte en la cabeza'],
  caminito: ['ninguna', 'Plano', 'No'],
  regalos: ['ninguna', 'De pie', 'No'],
  vidrio: ['rx-90', 'Plano, 5 copias', 'No'],
};
const R = { ninguna: (p) => p, rx180: ([x, y, z]) => [x, -y, -z], 'rx-90': ([x, y, z]) => [x, z, -y], ry90: ([x, y, z]) => [z, y, -x] };
mkdirSync(DEST, { recursive: true });
const plan = [];
let n = 1;
for (const [id, p] of Object.entries(PIEZAS)) {
  const J = JSON.parse(readFileSync(aqui(`out/parts/${id}.json`)));
  const [rot, como, sop] = ORIENT[id];
  const v = []; for (let i = 0; i < J.v.length; i += 3) v.push(R[rot]([J.v[i], J.v[i + 1], J.v[i + 2]]));
  const lo = [0, 1, 2].map((k) => Math.min(...v.map((q) => q[k]))), hi = [0, 1, 2].map((k) => Math.max(...v.map((q) => q[k])));
  const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]];
  const w = v.map((q) => [q[0] - c[0], q[1] - c[1], q[2] - c[2]]);
  const nt = J.t.length / 3, buf = Buffer.alloc(84 + 50 * nt);
  buf.write(`casita_iot ${id} mm`.padEnd(80, ' '), 0, 'ascii'); buf.writeUInt32LE(nt, 80);
  let vol = 0, area = 0;
  for (let i = 0; i < nt; i++) {
    const a = w[J.t[3 * i]], b = w[J.t[3 * i + 1]], d = w[J.t[3 * i + 2]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], s = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const nn = [u[1] * s[2] - u[2] * s[1], u[2] * s[0] - u[0] * s[2], u[0] * s[1] - u[1] * s[0]], L = Math.hypot(...nn) || 1;
    area += L / 2; vol += (a[0] * (b[1] * d[2] - b[2] * d[1]) - a[1] * (b[0] * d[2] - b[2] * d[0]) + a[2] * (b[0] * d[1] - b[1] * d[0])) / 6;
    const o = 84 + 50 * i; [nn[0] / L, nn[1] / L, nn[2] / L, ...a, ...b, ...d].forEach((x, k) => buf.writeFloatLE(x, o + 4 * k));
  }
  const nombre = `${String(n++).padStart(2, '0')}_${id}.stl`;
  writeFileSync(`${DEST}/${nombre}`, buf);
  // estimación sin slicer: cáscara de 0,8 mm (2 perímetros, 4 capas) y 15 % de relleno en el resto
  const cascara = Math.min(vol, area * 0.8), copias = id === 'vidrio' ? 5 : 1;
  const gramos = copias * 1.24 * (cascara + 0.15 * Math.max(0, vol - cascara)) / 1000;
  plan.push({ id, nombre, nom: p.nom, col: p.col, como, sop, dims: [0, 1, 2].map((k) => +(hi[k] - lo[k]).toFixed(1)), gramos: +gramos.toFixed(1), copias });
}
const total = plan.reduce((s, q) => s + q.gramos, 0);
writeFileSync(aqui('out/plan.json'), JSON.stringify({ plan, total }, null, 1));
for (const q of plan) console.log(q.nombre.padEnd(20), q.dims.join(' × ').padEnd(22), `${q.gramos} g`);
console.log('total', total.toFixed(0), 'g');
