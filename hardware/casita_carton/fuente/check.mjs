// Comprueba la maqueta de cartón para cada grosor: choques entre piezas y módulos,
// giro de la puerta con y sin pestillo, barrido del brazo y holguras. Escribe out/checks.json.
import { writeFileSync } from 'node:fs';
import { modelo, GROSORES, cruz, circulo, rect } from './carton.mjs';

const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const EPS = 0.05;

function dentroPoli(pts, u, v) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ui, vi] = pts[i], [uj, vj] = pts[j];
    if (vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) d = !d;
  }
  return d;
}
function distBorde(pts, u, v) {
  let m = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    const k = L ? Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / L)) : 0;
    m = Math.min(m, Math.hypot(u - ax - k * dx, v - ay - k * dy));
  }
  return m;
}
// Un sólido contiene p si p queda a más de EPS de todas sus caras
function contiene(s, p) {
  const d = resta(p, s.o), w = punto(d, s.N);
  if (w <= EPS || w >= s.th - EPS) return false;
  const u = punto(d, s.U), v = punto(d, s.V);
  if (u < s.bb[0] || u > s.bb[2] || v < s.bb[1] || v > s.bb[3]) return false;
  if (!dentroPoli(s.contorno, u, v) || distBorde(s.contorno, u, v) <= EPS) return false;
  for (const h of s.agujeros) if (dentroPoli(h, u, v) || distBorde(h, u, v) <= EPS) return false;
  return true;
}
function preparar(s) {
  s.bb = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [u, v] of s.contorno) { s.bb[0] = Math.min(s.bb[0], u); s.bb[1] = Math.min(s.bb[1], v); s.bb[2] = Math.max(s.bb[2], u); s.bb[3] = Math.max(s.bb[3], v); }
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const [u, v] of s.contorno) for (const w of [0, s.th]) {
    const q = [0, 1, 2].map((i) => s.o[i] + u * s.U[i] + v * s.V[i] + w * s.N[i]);
    for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], q[i]); hi[i] = Math.max(hi[i], q[i]); }
  }
  s.lo = lo; s.hi = hi; return s;
}
// Puntos interiores de un sólido, en una rejilla de paso h dentro del plano y 1 a 3 capas en el grosor
// Incluye las caras y los bordes: un contacto solo cuenta si un punto entra más de EPS en el otro sólido.
function muestras(s, h = 0.5, lo = null, hi = null) {
  const out = [], ws = s.th < 1 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1], uv = [];
  for (let u = s.bb[0] + h / 2; u < s.bb[2]; u += h) for (let v = s.bb[1] + h / 2; v < s.bb[3]; v += h) {
    if (dentroPoli(s.contorno, u, v) && !s.agujeros.some((g) => dentroPoli(g, u, v))) uv.push([u, v]);
  }
  for (const pol of [s.contorno, ...s.agujeros]) for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [au, av] = pol[j], [bu, bv] = pol[i], n = Math.max(1, Math.ceil(Math.hypot(bu - au, bv - av) / h));
    for (let k = 0; k < n; k++) uv.push([au + ((bu - au) * k) / n, av + ((bv - av) * k) / n]);
  }
  for (const [u, v] of uv) for (const k of ws) {
    const w = k * s.th, q = [0, 1, 2].map((i) => s.o[i] + u * s.U[i] + v * s.V[i] + w * s.N[i]);
    if (lo && (q[0] < lo[0] || q[1] < lo[1] || q[2] < lo[2] || q[0] > hi[0] || q[1] > hi[1] || q[2] > hi[2])) continue;
    out.push(q);
  }
  return out;
}
const solapan = (A, B) => [0, 1, 2].every((i) => A.lo[i] < B.hi[i] - EPS && B.lo[i] < A.hi[i] - EPS);

// Volúmenes de comprobación de los módulos como sólidos extruidos
function envSolido(e, nom) {
  if (e.tipo === 'caja') return { nom, o: e.a, U: X, V: Y, N: Z, th: e.b[2] - e.a[2], contorno: rect(0, 0, e.b[0] - e.a[0], e.b[1] - e.a[1]), agujeros: [] };
  const pts = circulo(e.c[0], e.c[1], e.r, 32), th = e.h1 - e.h0;
  if (e.eje === 'z') return { nom, o: [0, 0, e.h0], U: X, V: Y, N: Z, th, contorno: pts, agujeros: [] };
  if (e.eje === 'y') return { nom, o: [0, e.h1, 0], U: X, V: Z, N: cruz(X, Z), th, contorno: pts, agujeros: [] };
  return { nom, o: [e.h0, 0, 0], U: Y, V: Z, N: X, th, contorno: pts, agujeros: [] };
}
// Brazo del servo girado phi grados (0 = hacia +x) sobre su eje
function brazoSolidos(M, phi) {
  const r = (phi * Math.PI) / 180, U = [Math.cos(r), Math.sin(r), 0], V = [-Math.sin(r), Math.cos(r), 0], [xs, ys] = M.meca.servo;
  return M.meca.brazo.env.map((e, i) => preparar({ nom: ['Brazo del servo', 'Cubo del brazo', 'Taco del brazo'][i], grupo: 'brazo', o: [xs, ys, e.h0], U, V, N: Z, th: e.h1 - e.h0, contorno: e.pts, agujeros: [] }));
}
function girarZ(p, c, ang) {
  const r = (ang * Math.PI) / 180, x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * Math.cos(r) - y * Math.sin(r), c[1] + x * Math.sin(r) + y * Math.cos(r), p[2]];
}

function comprobar(t) {
  const M = modelo(t);
  const fijos = [], puerta = [];
  for (const p of M.piezas) p.solidos.forEach((s, i) => {
    const S = preparar({ ...s, nom: p.nom, pieza: p.id, grupo: p.grupo, idx: i, agujeros: (s.agujeros || []).map((g) => g.pts) });
    (p.grupo === 'puerta' ? puerta : fijos).push(S);
  });
  const mods = [];
  for (const m of M.modulos) m.env.forEach((e) => mods.push(preparar({ ...envSolido(e, m.nom), modulo: m.id, virtual: m.virtual })));
  M.iman.env.forEach((e) => puerta.push(preparar({ ...envSolido(e, M.iman.nom), modulo: 'iman' })));

  // 1. Choques estáticos, puerta cerrada y brazo en reposo
  const reposo = brazoSolidos(M, M.meca.libre);
  const todos = [...fijos, ...mods, ...puerta, ...reposo];
  const ignorar = (A, B) => (A.pieza && A.pieza === B.pieza && A.pieza === 'r_nieve')
    || (A.grupo === 'brazo' && B.grupo === 'brazo') || ((A.grupo === 'brazo' || B.grupo === 'brazo') && (A.modulo === 'servo' || B.modulo === 'servo'))
    || ((A.modulo === 'cables' && B.modulo === 'c1') || (A.modulo === 'c1' && B.modulo === 'cables'))
    || (A.modulo && A.modulo === B.modulo);
  const choques = [];
  for (let i = 0; i < todos.length; i++) for (let j = i + 1; j < todos.length; j++) {
    const A = todos[i], B = todos[j];
    if (ignorar(A, B) || !solapan(A, B)) continue;
    const lo = [0, 1, 2].map((k) => Math.max(A.lo[k], B.lo[k])), hi = [0, 1, 2].map((k) => Math.min(A.hi[k], B.hi[k]));
    const h = Math.min(0.5, Math.max(0.1, Math.min(A.th, B.th) / 2));
    const hit = muestras(A, h, lo, hi).find((q) => contiene(B, q)) || muestras(B, h, lo, hi).find((q) => contiene(A, q));
    if (hit) choques.push({ a: A.nom, b: B.nom, en: hit.map((x) => +x.toFixed(1)) });
  }

  // 2. Giro de la puerta: primer ángulo en que la hoja o el imán tocan algo
  const ptsPuerta = puerta.flatMap((s) => muestras(s, 0.5));
  const giro = (phi, max) => {
    const obst = [...fijos, ...mods.filter((m) => !m.virtual), ...brazoSolidos(M, phi)];
    let ultimo = 0;
    for (let ang = 0.25; ang <= max; ang += 0.25) {
      const q = ptsPuerta.map((p) => girarZ(p, M.meca.bisagra, ang));
      const lo = [0, 1, 2].map((k) => Math.min(...q.map((p) => p[k]))), hi = [0, 1, 2].map((k) => Math.max(...q.map((p) => p[k])));
      const cerca = obst.filter((o) => [0, 1, 2].every((k) => o.lo[k] < hi[k] && lo[k] < o.hi[k]));
      const golpe = q.find((p) => cerca.some((o) => contiene(o, p)));
      if (golpe) return { angulo: ultimo, contra: cerca.find((o) => contiene(o, golpe)).nom };
      ultimo = ang;
    }
    return { angulo: max, contra: null };
  };
  const libre = giro(M.meca.libre, 120), trabada = giro(M.meca.trabado, 60);
  const [px, py] = M.meca.bisagra;
  const juegoBorde = (+(Math.sin((trabada.angulo * Math.PI) / 180) * (9.5 - px)).toFixed(1));

  // 3. Barrido del brazo de reposo a trabado con la puerta cerrada
  const obstB = [...fijos, ...mods.filter((m) => m.modulo !== 'servo' && !m.virtual), ...puerta];
  let barrido = null;
  for (let phi = M.meca.libre; phi <= M.meca.trabado && !barrido; phi += 1) {
    for (const b of brazoSolidos(M, phi)) {
      const hit = muestras(b, 0.4).find((q) => obstB.some((o) => contiene(o, q)));
      if (hit) { barrido = { phi, contra: obstB.find((o) => contiene(o, hit)).nom }; break; }
    }
  }

  // 4. Holguras y medidas
  const servo = M.modulos.find((m) => m.id === 'servo').env[0], rele = M.modulos.find((m) => m.id === 'rele').env[0];
  const ventanas = [];
  const casa = [...M.modulos.filter((m) => m.grupo === 'casa'), M.iman];
  const huecos = [
    { pared: 'frente', eje: 'y', s: -1, cortes: [[-37, -19], [19, 37]] }, { pared: 'fondo', eje: 'y', s: 1, cortes: [[-9, 9]] },
    { pared: 'derecha', eje: 'x', s: 1, cortes: [[-9, 9]] }, { pared: 'izquierda', eje: 'x', s: -1, cortes: [[-9, 9]] },
  ];
  for (const m of casa) for (const e of m.env) for (const hz of huecos) {
    const k = hz.eje === 'y' ? 1 : 0, o = 1 - k, prof = hz.s > 0 ? 50 - e.a[k] : e.b[k] + 50;
    if (prof > 25 || prof < 0) continue;
    for (const [c0, c1] of hz.cortes) if (e.a[o] < c1 && e.b[o] > c0 && e.a[2] < 43 && e.b[2] > 25) ventanas.push(`${m.nom} tras la ventana ${hz.pared}`);
  }
  const A4 = M.piezas.filter((p) => p.plantilla).map((p) => ({ id: p.id, cabe: Math.max(p.ancho, p.alto) + 28 <= 277 && Math.min(p.ancho, p.alto) + 28 <= 190 }));
  return {
    t, choques, puerta: { libre, trabada, juegoBorde }, barrido,
    holguras: {
      tapaBandeja: +((M.T - 4 * t - 158) / 2).toFixed(2), tapon: +((100 - 2 * t - M.sTap) / 2).toFixed(2),
      servoRele: +(servo.a[2] - rele.b[2]).toFixed(1), usbSobreBorde: +(M.usb.z - 4.5 + 24).toFixed(1),
      jackSobreBorde: +(-13 - 4 + 24).toFixed(1), puertaUmbral: 0.5,
    },
    ventanas, A4, piezas: M.piezas.length, solidos: todos.length,
  };
}

export { comprobar };
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) main();
function main() {
const res = {};
for (const t of GROSORES) {
  const r = comprobar(t); res[t] = r;
  console.log(`t = ${t} mm: ${r.solidos} sólidos, ${r.choques.length} choques`);
  r.choques.slice(0, 12).forEach((c) => console.log('   choque:', c.a, '×', c.b, 'en', c.en.join(', ')));
  console.log(`   puerta libre ${r.puerta.libre.angulo}° (contra ${r.puerta.libre.contra}); trabada ${r.puerta.trabada.angulo}° (contra ${r.puerta.trabada.contra}), borde libre se mueve ${r.puerta.juegoBorde} mm`);
  console.log(`   barrido del brazo: ${r.barrido ? `choca a ${r.barrido.phi}° con ${r.barrido.contra}` : 'libre'}`);
  console.log('   holguras', JSON.stringify(r.holguras), '| ventanas', r.ventanas.length ? r.ventanas.join('; ') : 'nada visible', '| A4', r.A4.every((x) => x.cabe) ? 'todo cabe' : r.A4.filter((x) => !x.cabe).map((x) => x.id).join(','));
}
writeFileSync(new URL("out/checks.json", import.meta.url), JSON.stringify(res, null, 1));
}
