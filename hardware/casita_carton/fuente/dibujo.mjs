// Dibuja la plantilla de una pieza en SVG, en mm, con sus cotas. La usan el PDF 1:1 y la página.
// Clases: corte, opcional, pliegue, marca, deco, cota, txt, tit, sub.

export const fmt = (x) => { const v = Math.round(x * 2) / 2; return (Number.isInteger(v) ? String(v) : v.toFixed(1)).replace('.', ','); };
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MAT = { corrugado: 'cartón corrugado', cartulina: 'cartulina', microporoso: 'microporoso 2 mm', acetato: 'acetato' };

// Medidas del dibujo antes de colocarlo: caja de la pieza más cotas y rótulos
export function medir(p, fs, titulo = '') {
  const F = p.forma, us = F.contorno.map((q) => q[0]), vs = F.contorno.map((q) => q[1]);
  let u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs);
  for (const c of F.cotas || []) for (const q of [c.a, c.b]) {
    const x = q[0] + c.off[0] + Math.sign(c.off[0]) * fs * 1.4, y = q[1] + c.off[1] + Math.sign(c.off[1]) * fs * 1.4;
    u0 = Math.min(u0, x); u1 = Math.max(u1, x); v0 = Math.min(v0, y); v1 = Math.max(v1, y);
  }
  for (const r of F.rotulos || []) { const w = String(r.txt).length * fs * 0.27; u0 = Math.min(u0, r.p[0] - w); u1 = Math.max(u1, r.p[0] + w); v0 = Math.min(v0, r.p[1] - fs); v1 = Math.max(v1, r.p[1] + fs); }
  const m = fs * 0.6, cab = titulo ? fs * 2.4 : 0;
  u1 = Math.max(u1, u0 + titulo.length * fs * 0.6);
  return { u0: u0 - m, u1: u1 + m, v0: v0 - m, v1: v1 + m + cab, w: u1 - u0 + 2 * m, h: v1 - v0 + 2 * m + cab, cab };
}

export function titulo(p, copias = 1) {
  return p.nom + (p.cant > 1 ? (copias > 1 ? ` · ${copias} copias` : ` · cortar ${p.cant}`) : '');
}
export function svgPieza(p, { fs = 2.6, copias = 1, conTitulo = true } = {}) {
  const F = p.forma, tit = conTitulo ? titulo(p, copias) : '', M = medir(p, fs, tit);
  const X = (u) => u - M.u0, Yv = (v) => M.v1 - v;
  const d = (pts, cerrar = true) => pts.map((q, i) => `${i ? 'L' : 'M'}${X(q[0]).toFixed(2)} ${Yv(q[1]).toFixed(2)}`).join('') + (cerrar ? 'Z' : '');
  const o = [];
  if (conTitulo) {
    o.push(`<text class="tit" x="0" y="${(fs * 1.05).toFixed(2)}" font-size="${(fs * 1.12).toFixed(2)}">${esc(tit)}</text>`);
    o.push(`<text class="sub" x="0" y="${(fs * 2.1).toFixed(2)}" font-size="${(fs * 0.82).toFixed(2)}">${esc(MAT[p.mat] || p.mat)}${p.mat === 'corrugado' ? ` de ${fmt(p.grosor)} mm` : ''}</text>`);
  }
  // decoración impresa, recortada al contorno por puntos
  for (const l of F.deco || []) {
    const segs = []; let cur = [];
    const [a, b] = [l.pts[0], l.pts[l.pts.length - 1]];
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.5));
    const pts = l.recortar ? Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]) : l.pts;
    for (const q of pts) { if (!l.recortar || dentro(F.contorno, q[0], q[1])) cur.push(q); else { if (cur.length > 1) segs.push(cur); cur = []; } }
    if (cur.length > 1) segs.push(cur);
    for (const s of segs) o.push(`<path class="deco" d="${d(s, false)}"/>`);
  }
  o.push(`<path class="corte" d="${d(F.contorno)}${(F.agujeros || []).filter((g) => !g.opcional).map((g) => (g.r ? '' : d(g.pts))).join('')}" fill-rule="evenodd"/>`);
  for (const g of F.agujeros || []) {
    if (g.r) o.push(`<circle class="${g.opcional ? 'opcional' : 'corte'}" cx="${X(g.c[0]).toFixed(2)}" cy="${Yv(g.c[1]).toFixed(2)}" r="${g.r}"/>`);
    else if (g.opcional) o.push(`<path class="opcional" d="${d(g.pts)}"/>`);
  }
  for (const pl of F.pliegues || []) o.push(`<path class="pliegue" d="${d(pl, false)}"/>`);
  for (const mk of F.marcas || []) o.push(`<path class="marca" d="${d(mk.pts, !!mk.cerrado)}"/>`);
  const T = (u, v, txt, k = 1, extra = '') => o.push(`<text class="txt" x="${X(u).toFixed(2)}" y="${(Yv(v) + fs * 0.35 * k).toFixed(2)}" font-size="${(fs * k).toFixed(2)}" text-anchor="middle"${extra}>${esc(txt)}</text>`);
  // agujeros con nombre: medida, posición desde la esquina inferior izquierda y dónde va el texto
  const vistos = new Set(), u00 = minU(F), v00 = minV(F);
  const lineas = (u, v, ls, ancla, k) => ls.forEach((l, i) => o.push(`<text class="txt" x="${X(u).toFixed(2)}" y="${(Yv(v) + fs * k * (0.35 + 1.15 * i)).toFixed(2)}" font-size="${(fs * k).toFixed(2)}" text-anchor="${ancla}">${esc(l)}</text>`));
  for (const g of F.agujeros || []) {
    if (g.grupoNom && vistos.has(g.grupoNom)) continue;
    if (!g.nom && !g.grupoNom) continue;
    let cu, cv, w, h;
    if (g.r) { cu = g.c[0]; cv = g.c[1]; w = h = 2 * g.r; } else {
      const us = g.pts.map((q) => q[0]), vs = g.pts.map((q) => q[1]);
      cu = (Math.min(...us) + Math.max(...us)) / 2; cv = (Math.min(...vs) + Math.max(...vs)) / 2; w = Math.max(...us) - Math.min(...us); h = Math.max(...vs) - Math.min(...vs);
    }
    if (g.guardar) continue;
    const ls = [];
    if (g.grupoNom) { vistos.add(g.grupoNom); const n = F.agujeros.filter((q) => q.grupoNom === g.grupoNom).length; ls.push(`${n} × Ø${f1(w)}${g.opcional ? ' (opcional)' : ''}`); }
    else ls.push(`${g.nom} ${g.r ? `Ø${f1(w)}` : `${fmt(w)} × ${fmt(h)}`}`);
    if (p.pos || g.grupoNom) ls.push(`centro ${fmt(cu - u00)}; ${fmt(cv - v00)}`);
    if (g.verificar) ls.push('verificar en sitio');
    const k = 0.72, alto = ls.length * fs * k * 1.15;
    const lab = g.lab || (w > fs * 9 && h > alto + 2 ? 'dentro' : 'abajo');
    if (g.labP) lineas(g.labP[0], g.labP[1], ls, g.ancla || 'middle', k);
    else if (lab === 'dentro') lineas(cu, cv + alto / 2 - fs * k * 0.6, ls, 'middle', k);
    else if (lab === 'abajo') lineas(cu, cv - h / 2 - fs * 0.9, ls, 'middle', k);
    else if (lab === 'arriba') lineas(cu, cv + h / 2 + alto + fs * 0.1, ls, 'middle', k);
    else if (lab === 'der') lineas(cu + w / 2 + 1.5, cv + alto / 2 - fs * k * 0.6, ls, 'start', k);
    else lineas(cu - w / 2 - 1.5, cv + alto / 2 - fs * k * 0.6, ls, 'end', k);
  }
  for (const r of F.rotulos || []) T(r.p[0], r.p[1], r.txt, 0.78 * (r.tam || 1));
  for (const c of F.cotas || []) cota(o, c, X, Yv, fs);
  return { svg: o.join(''), w: M.w, h: M.h };
}
const minU = (F) => Math.min(...F.contorno.map((q) => q[0]));
const minV = (F) => Math.min(...F.contorno.map((q) => q[1]));
function dentro(pts, u, v) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [ui, vi] = pts[i], [uj, vj] = pts[j]; if (vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) d = !d; }
  return d;
}
function cota(o, c, X, Yv, fs) {
  const L = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]);
  if (L < 0.5) return;
  const a = [c.a[0] + c.off[0], c.a[1] + c.off[1]], b = [c.b[0] + c.off[0], c.b[1] + c.off[1]];
  const sg = [Math.sign(c.off[0]), Math.sign(c.off[1])], ext = (q, r) => `M${X(q[0]).toFixed(2)} ${Yv(q[1]).toFixed(2)}L${X(r[0] + sg[0] * 1).toFixed(2)} ${Yv(r[1] + sg[1] * 1).toFixed(2)}`;
  const vert = Math.abs(c.b[0] - c.a[0]) < 1e-6;
  let p = '';
  if (c.off[0] || c.off[1]) p += ext(c.a, a) + ext(c.b, b);
  p += `M${X(a[0]).toFixed(2)} ${Yv(a[1]).toFixed(2)}L${X(b[0]).toFixed(2)} ${Yv(b[1]).toFixed(2)}`;
  // marcas oblicuas en los extremos
  for (const q of [a, b]) p += `M${(X(q[0]) - 0.9).toFixed(2)} ${(Yv(q[1]) + 0.9).toFixed(2)}L${(X(q[0]) + 0.9).toFixed(2)} ${(Yv(q[1]) - 0.9).toFixed(2)}`;
  o.push(`<path class="cota" d="${p}"/>`);
  const mu = (a[0] + b[0]) / 2, mv = (a[1] + b[1]) / 2, k = 0.82, txt = c.txt || fmt(L);
  const lado = vert ? (sg[0] || -1) : (sg[1] || 1);
  if (vert) {
    const x = X(mu) + lado * fs * 0.45 * (lado > 0 ? 1.9 : 1), y = Yv(mv);
    o.push(`<text class="txt cota-t" x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${(fs * k).toFixed(2)}" text-anchor="middle" transform="rotate(-90 ${x.toFixed(2)} ${y.toFixed(2)})">${txt}</text>`);
  } else {
    const y = Yv(mv) + (lado > 0 ? -fs * 0.35 : fs * 0.95);
    o.push(`<text class="txt cota-t" x="${X(mu).toFixed(2)}" y="${y.toFixed(2)}" font-size="${(fs * k).toFixed(2)}" text-anchor="middle">${txt}</text>`);
  }
}
