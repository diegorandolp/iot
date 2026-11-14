// Comprobaciones mecánicas sobre las mallas generadas.
import { readFileSync, writeFileSync } from 'node:fs';
import { modulos, casa, PIV, SRV, ARM, IMPRESORA } from './spec.mjs';
const aqui = (f) => new URL(f, import.meta.url);
const carga = (id) => { const J = JSON.parse(readFileSync(aqui(`out/parts/${id}.json`))); const v = []; for (let i = 0; i < J.v.length; i += 3) v.push([J.v[i], J.v[i + 1], J.v[i + 2]]); return { v, t: J.t }; };
const tris = (m) => { const r = []; for (let i = 0; i < m.t.length; i += 3) r.push([m.v[m.t[i]], m.v[m.t[i + 1]], m.v[m.t[i + 2]]]); return r; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Solapamiento triángulo-caja por ejes separadores (Akenine-Möller)
function triCaja(tri, lo, hi) {
  const c = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2), h = [0, 1, 2].map((k) => (hi[k] - lo[k]) / 2);
  const v = tri.map((p) => sub(p, c)), e = [sub(v[1], v[0]), sub(v[2], v[1]), sub(v[0], v[2])];
  const ejes = [[1, 0, 0], [0, 1, 0], [0, 0, 1], cross(e[0], e[1])];
  for (const ei of e) for (const u of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) ejes.push(cross(u, ei));
  for (const a of ejes) {
    if (Math.hypot(...a) < 1e-12) continue;
    const p = v.map((q) => dot(q, a)), r = h[0] * Math.abs(a[0]) + h[1] * Math.abs(a[1]) + h[2] * Math.abs(a[2]);
    if (Math.min(...p) > r || Math.max(...p) < -r) return false;
  }
  return true;
}
const choques = (m, lo, hi, holgura = 0.15) => {
  const a = lo.map((x) => x + holgura), b = hi.map((x) => x - holgura);
  return tris(m).filter((t) => triCaja(t, a, b)).length;
};
// Punto dentro de malla cerrada: paridad de un rayo inclinado
function dentro(T, p) {
  const d = [0.5773, 0.5774, 0.5775]; let n = 0;
  for (const [a, b, c] of T) {
    const e1 = sub(b, a), e2 = sub(c, a), pv = cross(d, e2), det = dot(e1, pv);
    if (Math.abs(det) < 1e-12) continue;
    const tv = sub(p, a), u = dot(tv, pv) / det; if (u < 0 || u > 1) continue;
    const q = cross(tv, e1), w = dot(d, q) / det; if (w < 0 || u + w > 1) continue;
    if (dot(e2, q) / det > 0) n++;
  }
  return n % 2 === 1;
}
// Puntos sobre la superficie de una malla, uno cada ~paso mm²
function muestras(m, paso = 1.5) {
  const out = [];
  for (const [a, b, c] of tris(m)) {
    const ar = Math.hypot(...cross(sub(b, a), sub(c, a))) / 2, n = Math.max(1, Math.round(ar / paso));
    for (let i = 0; i < n; i++) { let r1 = Math.random(), r2 = Math.random(); if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; } out.push([0, 1, 2].map((k) => a[k] + r1 * (b[k] - a[k]) + r2 * (c[k] - a[k]))); }
  }
  return out;
}
const cajaPts = (lo, hi, s = 1.2) => { const r = []; for (let x = lo[0]; x <= hi[0] + 1e-9; x += s) for (let y = lo[1]; y <= hi[1] + 1e-9; y += s) for (let z = lo[2]; z <= hi[2] + 1e-9; z += s) { const borde = [x, y, z].some((q, k) => Math.abs(q - lo[k]) < s / 2 || Math.abs(q - hi[k]) > -s / 2 && Math.abs(q - hi[k]) < s); if (borde) r.push([x, y, z]); } return r; };
const enCaja = (p, lo, hi, h = 0.1) => p.every((q, k) => q > lo[k] + h && q < hi[k] - h);
const bbox = (T) => { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (const t of T) for (const p of t) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); } return [lo, hi]; };

const tapa = carga('tapa'), bandeja = carga('bandeja'), paredes = carga('paredes'), puerta = carga('puerta'), pest = carga('pestillo'), marcos = carga('marcos');
const R = { modulos: [], puerta: {}, pestillo: {}, cama: [] };
// módulos redondos: puntos de su cilindro que caen dentro de la tapa o la bandeja
function choquesCil(m) {
  const c = m.a.map((v, k) => (v + m.b[k]) / 2), ej = m.cil === 'y' ? 1 : 2, o = [0, 1, 2].filter((k) => k !== ej);
  const r = (m.b[o[0]] - m.a[o[0]]) / 2 - 0.15, pts = [];
  for (let a = 0; a < 64; a++) for (let s = 0.15; s <= 0.85; s += 0.1) for (const f of [0.4, 1]) {
    const p = c.slice(); p[o[0]] += r * f * Math.cos(a * Math.PI / 32); p[o[1]] += r * f * Math.sin(a * Math.PI / 32); p[ej] = m.a[ej] + 0.15 + s * (m.b[ej] - m.a[ej] - 0.3); pts.push(p);
  }
  return [tapa, bandeja].map(tris).reduce((n, T) => { const bb = bbox(T); return n + pts.filter((p) => enCaja(p, bb[0], bb[1], -0.01) && dentro(T, p)).length; }, 0);
}

// 1. Ningún módulo choca con las piezas impresas
for (const [id, m] of Object.entries(modulos)) {
  if (m.virtual) continue;
  const n = m.cil ? choquesCil(m) : choques(tapa, m.a, m.b) + choques(bandeja, m.a, m.b);
  R.modulos.push({ id, n: m.n, choques: n }); console.log(`${n ? 'CHOCA' : 'ok   '} ${m.n.padEnd(22)} ${n} triángulos`);
}
// los cables sobre la protoboard: solo la tapa puede invadir ese volumen
{ const m = modulos.cables; const n = choques(tapa, m.a, m.b); R.modulos.push({ id: 'cables', n: m.n, choques: n }); console.log(`${n ? 'CHOCA' : 'ok   '} ${m.n.padEnd(22)} ${n}`); }
for (const [id, m] of Object.entries(casa)) {
  if (id === 'iman') continue;
  const n = choques(paredes, m.a, m.b) + choques(tapa, m.a, m.b);
  R.modulos.push({ id, n: m.n, choques: n }); console.log(`${n ? 'CHOCA' : 'ok   '} ${m.n.padEnd(22)} ${n}`);
}
// los módulos tampoco se pisan entre sí
const todos = { ...modulos, reed: casa.reed, sw420: casa.sw420 }; const solapes = [];
const ks = Object.keys(todos).filter((k) => !['cables', 'aletas', 'torre'].includes(k));
for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
  const A = todos[ks[i]], B = todos[ks[j]];
  if ([0, 1, 2].every((k) => A.a[k] < B.b[k] - 0.1 && B.a[k] < A.b[k] - 0.1)) solapes.push(`${ks[i]}-${ks[j]}`);
}
R.solapes = solapes; console.log('solapes entre módulos:', solapes.length ? solapes : 'ninguno');

// 2. Giro de la puerta alrededor del pasador
const ptsPuerta = muestras(puerta, 1.2).concat(cajaPts(casa.iman.a, casa.iman.b));
const obst = [paredes, marcos].map(tris);
const cajasFijas = [casa.reed, casa.sw420].map((c) => [c.a, c.b]);
const brazo = (ang) => { // 0 = vertical; negativo = hacia -x, como la ranura de la tapa
  const pts = muestras(pest, 1.0); const a = (-ang * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y, z]) => { const dx = x - SRV.x, dz = z - SRV.z; return [SRV.x + dx * c - dz * s, y, SRV.z + dx * s + dz * c]; });
};
function giroLibre(cerrojo) {
  const bp = cerrojo ? brazo(0) : null;
  let bLo, bHi; if (bp) { bLo = [0, 1, 2].map((k) => Math.min(...bp.map((p) => p[k]))); bHi = [0, 1, 2].map((k) => Math.max(...bp.map((p) => p[k]))); }
  const bbs = obst.map(bbox);
  for (let g = 0.5; g <= 95; g += 0.5) {
    const a = (g * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    for (const p of ptsPuerta) {
      const dx = p[0] - PIV.x, dy = p[1] - PIV.y; const q = [PIV.x + dx * c - dy * s, PIV.y + dx * s + dy * c, p[2]];
      for (let o = 0; o < obst.length; o++) if (enCaja(q, bbs[o][0], bbs[o][1], -0.01) && dentro(obst[o], q)) return { angulo: g - 0.5, contra: o ? 'marcos' : 'paredes', punto: q.map((x) => +x.toFixed(1)) };
      for (const [lo, hi] of cajasFijas) if (enCaja(q, lo, hi)) return { angulo: g - 0.5, contra: lo === casa.reed.a ? 'reed' : 'SW-420', punto: q.map((x) => +x.toFixed(1)) };
      if (bp && enCaja(q, bLo, bHi)) return { angulo: g - 0.5, contra: 'pestillo', punto: q.map((x) => +x.toFixed(1)) };
    }
  }
  return { angulo: 95, contra: null };
}
R.puerta.libre = giroLibre(false); R.puerta.trabada = giroLibre(true);
console.log('puerta sin cerrojo abre hasta', R.puerta.libre); console.log('puerta con cerrojo abre hasta', R.puerta.trabada);
// la puerta cerrada no invade las paredes (holgura de montaje)
R.puerta.cerrada = ptsPuerta.filter((p) => dentro(obst[0], p)).length; console.log('puntos de la puerta cerrada dentro de las paredes:', R.puerta.cerrada);

// 3. Barrido del pestillo desde el reposo hasta vertical
const tT = tris(tapa), tb = bbox(tT); let peor = 0, angChoque = null;
for (let g = ARM.reposo; g <= 0; g += 3) {
  const n = brazo(g).filter((p) => enCaja(p, tb[0], tb[1], -0.01) && dentro(tT, p)).length;
  if (n > peor) { peor = n; angChoque = g; }
}
const ptsCerrado = brazo(0); const arriba = Math.max(...ptsCerrado.map((p) => p[2]));
R.pestillo = { puntosDentroDeLaTapa: peor, angulo: angChoque, alturaSobreElPiso: +arriba.toFixed(1) };
console.log('pestillo:', R.pestillo);

// 4. Cada pieza cabe en la cama
const aud = JSON.parse(readFileSync(aqui('out/auditoria.json')));
for (const [id, a] of Object.entries(aud)) {
  const d = a.hi.map((v, i) => v - a.lo[i]); const cabe = d[0] <= IMPRESORA.x && d[1] <= IMPRESORA.y && d[2] <= IMPRESORA.z;
  R.cama.push({ id, d: d.map((x) => +x.toFixed(1)), cabe });
}
console.log('todas caben en la cama:', R.cama.every((c) => c.cabe));
writeFileSync(aqui('out/checks.json'), JSON.stringify(R, null, 1));
