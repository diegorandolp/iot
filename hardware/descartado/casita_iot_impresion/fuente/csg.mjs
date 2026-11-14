// CSG por árbol BSP (Laidlaw/Naylor, como csg.js) y limpieza a malla estanca para impresión.
const EPS = 1e-5;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

class Plane {
  constructor(n, w) { this.n = n; this.w = w; }
  static from(a, b, c) {
    const n = cross(sub(b, a), sub(c, a)); const l = Math.hypot(...n);
    if (l < 1e-12) return null;
    const u = [n[0] / l, n[1] / l, n[2] / l];
    return new Plane(u, dot(u, a));
  }
  flip() { this.n = this.n.map((x) => -x); this.w = -this.w; }
  clone() { return new Plane(this.n.slice(), this.w); }
  split(p, cf, cb, f, b) {
    const COP = 0, FR = 1, BK = 2, SP = 3; let pt = 0; const ty = [];
    for (const v of p.v) { const t = dot(this.n, v) - this.w; const k = t < -EPS ? BK : t > EPS ? FR : COP; pt |= k; ty.push(k); }
    if (pt === COP) (dot(this.n, p.pl.n) > 0 ? cf : cb).push(p);
    else if (pt === FR) f.push(p);
    else if (pt === BK) b.push(p);
    else {
      const ff = [], bb = [];
      for (let i = 0; i < p.v.length; i++) {
        const j = (i + 1) % p.v.length, ti = ty[i], tj = ty[j], vi = p.v[i], vj = p.v[j];
        if (ti !== BK) ff.push(vi);
        if (ti !== FR) bb.push(vi);
        if ((ti | tj) === SP) {
          const t = (this.w - dot(this.n, vi)) / dot(this.n, sub(vj, vi)); const m = lerp(vi, vj, t);
          ff.push(m); bb.push(m);
        }
      }
      if (ff.length >= 3) f.push(new Poly(ff, p.pl));
      if (bb.length >= 3) b.push(new Poly(bb, p.pl));
    }
  }
}
class Poly {
  constructor(v, pl) { this.v = v; this.pl = pl || Plane.from(v[0], v[1], v[2]); }
  flip() { const q = new Poly(this.v.slice().reverse(), this.pl.clone()); q.pl.flip(); return q; }
}
class Node {
  constructor(ps) { this.pl = null; this.f = null; this.b = null; this.ps = []; if (ps) this.build(ps); }
  invert() {
    this.ps = this.ps.map((p) => p.flip());
    if (this.pl) { this.pl = this.pl.clone(); this.pl.flip(); }
    if (this.f) this.f.invert(); if (this.b) this.b.invert();
    const t = this.f; this.f = this.b; this.b = t;
  }
  clip(ps) {
    if (!this.pl) return ps.slice();
    let f = [], b = [];
    for (const p of ps) this.pl.split(p, f, b, f, b);
    if (this.f) f = this.f.clip(f);
    b = this.b ? this.b.clip(b) : [];
    return f.concat(b);
  }
  clipTo(n) { this.ps = n.clip(this.ps); if (this.f) this.f.clipTo(n); if (this.b) this.b.clipTo(n); }
  all() { let r = this.ps.slice(); if (this.f) r = r.concat(this.f.all()); if (this.b) r = r.concat(this.b.all()); return r; }
  build(ps) {
    if (!ps.length) return;
    if (!this.pl) this.pl = ps[0].pl.clone();
    const f = [], b = [];
    for (const p of ps) this.pl.split(p, this.ps, this.ps, f, b);
    if (f.length) { if (!this.f) this.f = new Node(); this.f.build(f); }
    if (b.length) { if (!this.b) this.b = new Node(); this.b.build(b); }
  }
}
export class Solid {
  constructor(ps) { this.ps = ps.filter((p) => p.pl); }
  static fromTris(v, t) {
    const ps = [];
    for (let i = 0; i < t.length; i += 3) {
      const g = (k) => [v[3 * k], v[3 * k + 1], v[3 * k + 2]];
      const a = g(t[i]), b = g(t[i + 1]), c = g(t[i + 2]); const pl = Plane.from(a, b, c);
      if (pl) ps.push(new Poly([a, b, c], pl));
    }
    return new Solid(ps);
  }
  union(o) { const a = new Node(this.ps), b = new Node(o.ps); a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert(); a.build(b.all()); return new Solid(a.all()); }
  subtract(o) { const a = new Node(this.ps), b = new Node(o.ps); a.invert(); a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert(); a.build(b.all()); a.invert(); return new Solid(a.all()); }
  intersect(o) { const a = new Node(this.ps), b = new Node(o.ps); a.invert(); b.clipTo(a); b.invert(); a.clipTo(b); b.clipTo(a); a.build(b.all()); a.invert(); return new Solid(a.all()); }
  xf(fn) { return new Solid(this.ps.map((p) => new Poly(p.v.map(fn)))); }
  mesh() { return reparar(limpiar(this.ps)); }
}
export const box = (a, b) => {
  const [x0, y0, z0] = a, [x1, y1, z1] = b;
  const c = (i) => [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0];
  const q = [[0, 4, 6, 2], [1, 3, 7, 5], [0, 1, 5, 4], [2, 6, 7, 3], [0, 2, 3, 1], [4, 5, 7, 6]];
  return new Solid(q.map((f) => new Poly(f.map(c))));
};
// cilindro entre dos puntos
export const cyl = (p0, p1, r, n = 40) => {
  const d = sub(p1, p0), L = Math.hypot(...d), w = d.map((x) => x / L);
  const u0 = Math.abs(w[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  let u = cross(w, u0); const lu = Math.hypot(...u); u = u.map((x) => x / lu); const v = cross(w, u);
  const P = (i, base) => { const a = (2 * Math.PI * i) / n; return [0, 1, 2].map((k) => base[k] + r * (Math.cos(a) * u[k] + Math.sin(a) * v[k])); };
  const ps = [], top = [], bot = [];
  for (let i = 0; i < n; i++) { top.push(P(i, p1)); bot.unshift(P(i, p0)); ps.push(new Poly([P(i, p0), P(i + 1, p0), P(i + 1, p1), P(i, p1)])); }
  ps.push(new Poly(top), new Poly(bot));
  return new Solid(ps);
};
// prisma vertical desde un polígono convexo en XY
export const prism = (pts0, z0, z1) => {
  let ar = 0; pts0.forEach((p, i) => { const q = pts0[(i + 1) % pts0.length]; ar += p[0] * q[1] - q[0] * p[1]; });
  const pts = ar < 0 ? pts0.slice().reverse() : pts0;
  const ps = [new Poly(pts.map(([x, y]) => [x, y, z1])), new Poly(pts.slice().reverse().map(([x, y]) => [x, y, z0]))];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    ps.push(new Poly([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]]));
  }
  return new Solid(ps);
};
// une por parejas para mantener los árboles BSP pequeños
export const uni = (l) => {
  let a = l.slice();
  while (a.length > 1) { const n = []; for (let i = 0; i < a.length; i += 2) n.push(i + 1 < a.length ? a[i].union(a[i + 1]) : a[i]); a = n; }
  return a[0];
};

// Suelda vértices, repara uniones en T y triangula.
function limpiar(ps) {
  // soldadura por vecindad: dos puntos a menos de 0,01 mm son el mismo vértice
  const Q = 0.01, mapa = new Map(), V = [];
  const id = (p) => {
    const cx = Math.floor(p[0] / Q), cy = Math.floor(p[1] / Q), cz = Math.floor(p[2] / Q);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const l = mapa.get(`${cx + dx},${cy + dy},${cz + dz}`); if (!l) continue;
      for (const i of l) { const q = V[i]; if (Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) < Q) return i; }
    }
    const i = V.length; V.push(p); const k = `${cx},${cy},${cz}`;
    if (!mapa.has(k)) mapa.set(k, []); mapa.get(k).push(i); return i;
  };
  let polys = [];
  for (const p of ps) {
    const a = []; for (const q of p.v) { const i = id(q); if (a[a.length - 1] !== i) a.push(i); }
    if (a.length > 1 && a[0] === a[a.length - 1]) a.pop();
    if (a.length >= 3) polys.push(a);
  }
  const C = 4, celdas = new Map();
  const ck = (x, y, z) => `${Math.floor(x / C)},${Math.floor(y / C)},${Math.floor(z / C)}`;
  V.forEach((p, i) => { const k = ck(...p); if (!celdas.has(k)) celdas.set(k, []); celdas.get(k).push(i); });
  const enArista = (a, b) => {
    const pa = V[a], pb = V[b], d = sub(pb, pa), L2 = dot(d, d), L = Math.sqrt(L2), out = [];
    const pasos = Math.ceil(L / C) + 1, vistos = new Set();
    for (let s = 0; s <= pasos; s++) {
      const m = lerp(pa, pb, s / pasos);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const l = celdas.get(ck(m[0] + dx * C, m[1] + dy * C, m[2] + dz * C)); if (!l) continue;
        for (const i of l) {
          if (i === a || i === b || vistos.has(i)) continue; vistos.add(i);
          const e = sub(V[i], pa), t = dot(e, d) / L2; if (t <= 1e-6 || t >= 1 - 1e-6) continue;
          if (Math.hypot(...cross(e, d)) / L < 0.008) out.push([t, i]);
        }
      }
    }
    return out.sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  };
  const cache = new Map();
  polys = polys.map((a) => {
    const r = [];
    for (let i = 0; i < a.length; i++) {
      const u = a[i], w = a[(i + 1) % a.length]; r.push(u);
      const k = u < w ? `${u}_${w}` : `${w}_${u}`;
      let m = cache.get(k); if (!m) { m = enArista(Math.min(u, w), Math.max(u, w)); cache.set(k, m); }
      r.push(...(u < w ? m : m.slice().reverse()));
    }
    return r;
  });
  const T = [];
  for (const a of polys) orejas(a, V, T);
  return { v: V, t: T };
}
// Corte de orejas de polígonos convexos que pueden traer vértices colineales.
function orejas(a, V, T) {
  const n = a.slice(); let nrm = [0, 0, 0];
  for (let i = 0; i < n.length; i++) { const p = V[n[i]], q = V[n[(i + 1) % n.length]]; nrm = [nrm[0] + (p[1] - q[1]) * (p[2] + q[2]), nrm[1] + (p[2] - q[2]) * (p[0] + q[0]), nrm[2] + (p[0] - q[0]) * (p[1] + q[1])]; }
  if (Math.hypot(...nrm) < 1e-9) return;
  const lim = 1e-9 * Math.hypot(...nrm);
  let g = 0;
  while (n.length > 3 && g++ < 5000) {
    // la oreja positiva más pequeña consume primero los vértices colineales
    let mejor = -1, area = Infinity, resp = -1, areaR = Infinity;
    for (let i = 0; i < n.length; i++) {
      const p = V[n[(i + n.length - 1) % n.length]], q = V[n[i]], r = V[n[(i + 1) % n.length]];
      const s = dot(cross(sub(q, p), sub(r, q)), nrm);
      if (s > lim && s < areaR) { areaR = s; resp = i; }
      if (!(s > lim && s < area)) continue;
      // la diagonal no puede pasar por encima de otro vértice del borde
      const d = sub(r, p), L2 = dot(d, d); let libre = true;
      for (let j = 0; j < n.length && libre; j++) {
        if (j === i || j === (i + 1) % n.length || j === (i + n.length - 1) % n.length) continue;
        const e = sub(V[n[j]], p), t = dot(e, d) / L2;
        if (t > -1e-9 && t < 1 + 1e-9 && Math.hypot(...cross(e, d)) / Math.sqrt(L2) < 0.008) libre = false;
      }
      if (libre) { area = s; mejor = i; }
    }
    if (mejor < 0) mejor = resp;
    if (mejor < 0) break;
    T.push(n[(mejor + n.length - 1) % n.length], n[mejor], n[(mejor + 1) % n.length]);
    n.splice(mejor, 1);
  }
  if (n.length === 3 && Math.hypot(...cross(sub(V[n[1]], V[n[0]]), sub(V[n[2]], V[n[1]]))) > 1e-10) T.push(n[0], n[1], n[2]);
}
// Colapsa aristas de menos de 0,08 mm (astillas del BSP) y quita caras repetidas u opuestas.
function reparar(m, eps = 0.08) {
  let t = m.t.slice(); const V = m.v;
  for (let it = 0; it < 6; it++) {
    const p = V.map((_, i) => i);
    const r = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
    let cambios = 0;
    for (let i = 0; i < t.length; i += 3) for (let j = 0; j < 3; j++) {
      const a = r(t[i + j]), b = r(t[i + (j + 1) % 3]);
      if (a !== b && Math.hypot(...sub(V[a], V[b])) < eps) { p[Math.max(a, b)] = Math.min(a, b); cambios++; }
    }
    const nt = [], vistas = new Map();
    for (let i = 0; i < t.length; i += 3) {
      const a = r(t[i]), b = r(t[i + 1]), c = r(t[i + 2]);
      if (a === b || b === c || a === c) continue;
      const k = [a, b, c].sort((x, y) => x - y).join('_');
      const prev = vistas.get(k);
      if (prev !== undefined) {
        // dos caras sobre los mismos vértices: si son opuestas se anulan, si son iguales sobra una
        const q = nt.slice(prev, prev + 3); const igual = [0, 1, 2].some((s) => q[s] === a && q[(s + 1) % 3] === b);
        if (!igual) nt.splice(prev, 3, -1, -1, -1); vistas.delete(k); cambios++; continue;
      }
      vistas.set(k, nt.length); nt.push(a, b, c);
    }
    t = nt.filter((x) => x >= 0);
    if (!cambios) break;
  }
  // compacta los vértices usados
  const nuevo = new Map(), v = [];
  const tt = t.map((i) => { if (!nuevo.has(i)) { nuevo.set(i, v.length); v.push(V[i]); } return nuevo.get(i); });
  return { v, t: tt };
}
// Comprobación: cada arista dirigida tiene exactamente su pareja inversa.
export function auditar(m) {
  const e = new Map(); let degen = 0;
  for (let i = 0; i < m.t.length; i += 3) {
    const a = m.t[i], b = m.t[i + 1], c = m.t[i + 2];
    if (a === b || b === c || a === c) { degen++; continue; }
    for (const [u, w] of [[a, b], [b, c], [c, a]]) { const k = `${u}_${w}`; e.set(k, (e.get(k) || 0) + 1); }
  }
  let abiertas = 0, dobles = 0;
  for (const [k, n] of e) {
    const [u, w] = k.split('_'); const r = e.get(`${w}_${u}`) || 0;
    if (r === 0) abiertas++; else if (n !== r || n > 1) dobles++;
  }
  let vol = 0, area = 0; const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < m.t.length; i += 3) {
    const a = m.v[m.t[i]], b = m.v[m.t[i + 1]], c = m.v[m.t[i + 2]];
    vol += dot(a, cross(b, c)) / 6; area += Math.hypot(...cross(sub(b, a), sub(c, a))) / 2;
  }
  for (const p of m.v) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
  return { tris: m.t.length / 3, abiertas, dobles, degen, vol, area, lo, hi };
}
