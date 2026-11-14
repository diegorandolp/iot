// Plantillas 1:1 en A4 para cada grosor: out/plantillas_<t>mm.html y ../plantillas_<t>mm.pdf (Chromium).
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { modelo, GROSORES } from './carton.mjs';
import { svgPieza, fmt } from './dibujo.mjs';

const aqui = (f) => new URL(f, import.meta.url);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MAT = { corrugado: 'Cartón corrugado', cartulina: 'Cartulina', microporoso: 'Microporoso 2 mm', acetato: 'Acetato o papel vegetal' };
const AW = 190, AH = 277, CAB = 7, GAP = 5, FS = 2.6;

// Guillotina: cada pieza va al hueco libre donde sobra menos; el hueco se parte en dos
// La primera hoja es la portada: solo queda libre la franja bajo la tabla.
const Y1 = 192;
// Prueba varios órdenes y se queda con el que usa menos hojas
function empaquetar(items) {
  const ordenes = [(a, b) => b.w * b.h - a.w * a.h, (a, b) => b.h - a.h || b.w - a.w, (a, b) => b.w - a.w || b.h - a.h, (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h)];
  return ordenes.map((o) => empaquetarCon([...items].sort(o))).sort((x, y) => x.length - y.length)[0];
}
function empaquetarCon(items) {
  const hojas = [{ libres: [{ x: 0, y: Y1, w: AW, h: AH - Y1 - 5 }], piezas: [] }];
  const nueva = () => { const h = { libres: [{ x: 0, y: 0, w: AW, h: AH - CAB }], piezas: [] }; hojas.push(h); return h; };
  for (const it of items) {
    let mejor = null;
    for (const h of hojas) h.libres.forEach((r, i) => {
      if (it.w <= r.w && it.h <= r.h) { const s = Math.min(r.w - it.w, r.h - it.h); if (!mejor || s < mejor.s) mejor = { h, i, s }; }
    });
    if (!mejor) { const h = nueva(); mejor = { h, i: 0 }; }
    const r = mejor.h.libres.splice(mejor.i, 1)[0];
    mejor.h.piezas.push({ ...it, x: r.x, y: r.y });
    const derecha = { x: r.x + it.w + GAP, y: r.y, w: r.w - it.w - GAP }, abajo = { x: r.x, y: r.y + it.h + GAP, h: r.h - it.h - GAP };
    // corte por el lado más corto del sobrante
    if (r.w - it.w < r.h - it.h) { derecha.h = it.h; abajo.w = r.w; } else { derecha.h = r.h; abajo.w = it.w; }
    for (const q of [derecha, abajo]) if (q.w > 5 && q.h > 5) mejor.h.libres.push(q);
  }
  return hojas.map((h) => h.piezas);
}

export function plantillas(t) {
  const M = modelo(t);
  const items = [];
  for (const p of M.piezas.filter((q) => q.plantilla)) {
    const copias = p.mat === 'corrugado' ? 1 : p.cant;
    for (let k = 0; k < copias; k++) { const s = svgPieza(p, { fs: FS, copias, conTitulo: k === 0 }); items.push({ ...s, id: p.id }); }
  }
  const hojas = empaquetar(items);
  const total = hojas.length;
  const dibujar = (h) => `<svg class="capa" width="${AW}mm" height="${AH}mm" viewBox="0 0 ${AW} ${AH}">${h.map((it) => `<g transform="translate(${it.x.toFixed(2)} ${it.y.toFixed(2)})">${it.svg}</g>`).join('')}</svg>`;
  const pie = (n) => `<div class="pie">Casita IoT de cartón · plantillas 1:1 · cartón de ${fmt(t)} mm · hoja ${n} de ${total}</div>`;
  const MATC = { corrugado: 'corrugado', cartulina: 'cartulina', microporoso: 'microporoso', acetato: 'acetato' };
  const fila = (p) => `<tr><td>${esc(p.nom)}</td><td>${MATC[p.mat]}</td><td class="n">${p.cant}</td><td class="n">${fmt(p.ancho)} × ${fmt(p.alto)}</td><td>${p.plantilla ? 'plantilla' : 'regla'}</td></tr>`;
  const cabT = '<thead><tr><th>Pieza</th><th>Material</th><th class="n">Cant.</th><th class="n">mm</th><th>Cómo</th></tr></thead>';
  const mitad = Math.ceil(M.piezas.length / 2);
  const tablas = [M.piezas.slice(0, mitad), M.piezas.slice(mitad)].map((l) => `<table>${cabT}<tbody>${l.map(fila).join('')}</tbody></table>`).join('');
  const portada = `<section class="hoja">
    <h1>Casita IoT de cartón: plantillas 1:1</h1>
    <p class="lead">Para cartón corrugado de <b>${fmt(t)} mm</b>. Midan el suyo con una regla: si no coincide, usen el PDF de su grosor. Impriman al <b>100 %</b>, sin «ajustar a la página», y comprueben el cuadrado.</p>
    <div class="fila">
      <svg width="50mm" height="50mm" viewBox="0 0 50 50"><rect x="0.15" y="0.15" width="49.7" height="49.7" fill="none" stroke="#000" stroke-width="0.3"/><text x="25" y="27" font-size="4" text-anchor="middle">50 × 50 mm</text></svg>
      <svg width="120mm" height="50mm" viewBox="0 0 120 50" class="leyenda">
        <path class="corte" d="M2 6H30"/><text x="34" y="7.2" font-size="3.2">Corte</text>
        <path class="opcional" d="M2 14H30"/><text x="34" y="15.2" font-size="3.2">Corte opcional (MQ-2)</text>
        <path class="pliegue" d="M2 22H30"/><text x="34" y="23.2" font-size="3.2">Doblez: marcar con la punta de la tijera</text>
        <path class="marca" d="M2 30H30"/><text x="34" y="31.2" font-size="3.2">Marca de lápiz: dónde va otra pieza</text>
        <path class="cota" d="M2 38H30M1.1 38.9L2.9 37.1M29.1 38.9L30.9 37.1"/><text x="16" y="36.6" font-size="2.6" text-anchor="middle">28</text><text x="34" y="39.2" font-size="3.2">Medida en mm</text>
        <text x="2" y="47" font-size="2.8">Posiciones «centro u; v»: en mm desde la esquina inferior izquierda.</text>
      </svg>
    </div>
    <h2>Todas las piezas</h2>
    <p class="nota">Las que dicen «regla» son rectángulos sin agujeros: márquenlas con regla y escuadra. Medidas: ancho × alto de la pieza como se dibuja.</p>
    <div class="dos">${tablas}</div>
    ${dibujar(hojas[0])}${pie(1)}</section>`;
  const paginas = hojas.slice(1).map((h, i) => `<section class="hoja">${dibujar(h)}${pie(i + 2)}</section>`).join('');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Plantillas ${fmt(t)} mm</title><style>
    @page { size: A4; margin: 0 }
    * { box-sizing: border-box } body { margin: 0; font-family: "IBM Plex Sans", "Noto Sans", sans-serif; color: #111 }
    .hoja { width: 210mm; height: 297mm; padding: 10mm; position: relative; page-break-after: always; overflow: hidden }
    .capa { position: absolute; left: 10mm; top: 10mm } .pie { position: absolute; left: 10mm; bottom: 5mm; font-size: 2.6mm; color: #555 }
    h1 { font-size: 7mm; margin: 0 0 3mm } h2 { font-size: 4.6mm; margin: 6mm 0 1.5mm } .lead { font-size: 3.5mm; margin: 0 0 5mm; line-height: 1.4 } .nota { font-size: 3mm; margin: 0 0 2mm; color: #333 }
    .fila { display: flex; gap: 10mm; align-items: center }
    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; align-items: start }
    table { border-collapse: collapse; width: 100%; font-size: 2.45mm } th, td { text-align: left; padding: 0.55mm 0.9mm; border-bottom: 0.15mm solid #ccc } td.n, th.n { text-align: right }
    .corte { fill: none; stroke: #000; stroke-width: 0.3 } .opcional { fill: none; stroke: #000; stroke-width: 0.3; stroke-dasharray: 1.6 1 }
    .pliegue { fill: none; stroke: #000; stroke-width: 0.25; stroke-dasharray: 3 1 0.6 1 } .marca { fill: none; stroke: #777; stroke-width: 0.2; stroke-dasharray: 1 0.8 }
    .deco { fill: none; stroke: #999; stroke-width: 0.18 } .cota { fill: none; stroke: #444; stroke-width: 0.15 }
    .txt { fill: #222 } .tit { font-weight: 600; fill: #000 } .sub { fill: #555 } .leyenda text { fill: #111 }
  </style></head><body>${portada}${paginas}</body></html>`;
  return { html, hojas: total, items: items.length };
}

const main = fileURLToPath(import.meta.url) === process.argv[1];
if (main) {
  for (const t of GROSORES) {
    const { html, hojas, items } = plantillas(t);
    const f = fileURLToPath(aqui(`out/plantillas_${t}mm.html`)), pdf = fileURLToPath(aqui(`../plantillas_${t}mm.pdf`));
    writeFileSync(f, html);
    execFileSync('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer', '--print-to-pdf-no-header', `--print-to-pdf=${pdf}`, `file://${f}`], { stdio: 'ignore' });
    console.log(`t = ${t} mm: ${items} dibujos en ${hojas} hojas → ${pdf}`);
  }
}
