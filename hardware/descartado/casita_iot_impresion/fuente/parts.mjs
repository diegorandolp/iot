// Construye cada pieza en coordenadas de ensamble.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Solid, box, cyl, prism, uni, auditar } from './csg.mjs';
import { Z, PIV, SRV, ARM, POST, PIR, BUZ, GAS, USBX, JACKX, modulos } from './spec.mjs';

const aqui = (f) => new URL(f, import.meta.url);
const O = JSON.parse(readFileSync(aqui('orig.json'), 'utf8'));
const orig = (n) => Solid.fromTris(O[n].v, O[n].t);

// Separa las islas conexas de una malla original
function islas(n) {
  const { v, t } = O[n]; const p = [...Array(v.length / 3).keys()];
  const r = (x) => { while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
  for (let i = 0; i < t.length; i += 3) { p[r(t[i])] = r(t[i + 1]); p[r(t[i + 1])] = r(t[i + 2]); }
  const g = new Map();
  for (let i = 0; i < t.length; i += 3) { const k = r(t[i]); if (!g.has(k)) g.set(k, []); g.get(k).push(t[i], t[i + 1], t[i + 2]); }
  return [...g.values()].map((tt) => Solid.fromTris(v, tt));
}
const zcyl = (x, y, z0, z1, r, n = 32) => cyl([x, y, z0], [x, y, z1], r, n);
const ycyl = (x, z, y0, y1, r, n = 32) => cyl([x, y0, z], [x, y1, z], r, n);
const rot = (s, a, cx, cy) => { const c = Math.cos(a), n = Math.sin(a); return s.xf(([x, y, z]) => [cx + (x - cx) * c - (y - cy) * n, cy + (x - cx) * n + (y - cy) * c, z]); };
const esq = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [a * POST, b * POST]);

// Copo de nieve de 6 brazos: rejilla decorativa sobre el buzzer y el MQ-2
function copo(cx, cy, R, z0, z1) {
  const l = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    l.push(rot(box([cx, cy - 0.75, z0], [cx + R, cy + 0.75, z1]), a, cx, cy));
    for (const s of [1, -1]) {
      const b = rot(box([cx + R * 0.56, cy - 0.65, z0], [cx + R * 0.9, cy + 0.65, z1]), s * 1.05, cx + R * 0.56, cy);
      l.push(rot(b, a, cx, cy));
    }
  }
  return uni(l);
}
// Guías cortas en los lados indicados: fijan cada módulo y dejan pasar cables por el medio
function guias(a, b, lados, c = 0.8, largo = 11, h = 4) {
  const [x0, y0] = [a[0] - c, a[1] - c], [x1, y1] = [b[0] + c, b[1] + c], t = 1.6, z0 = Z.piso - 0.2, z1 = Z.piso + h;
  const l = [];
  // las guías de los lados x cubren también la esquina, para que no se toquen solo por una arista
  if (lados.includes('x-')) l.push(box([x0 - t, y0 - t, z0], [x0, y0 + largo, z1]), box([x0 - t, y1 - largo, z0], [x0, y1 + t, z1]));
  if (lados.includes('x+')) l.push(box([x1, y0 - t, z0], [x1 + t, y0 + largo, z1]), box([x1, y1 - largo, z0], [x1 + t, y1 + t, z1]));
  if (lados.includes('y-')) l.push(box([x0, y0 - t, z0], [x0 + largo, y0, z1]), box([x1 - largo, y0 - t, z0], [x1, y0, z1]));
  if (lados.includes('y+')) l.push(box([x0, y1, z0], [x0 + largo, y1 + t, z1]), box([x1 - largo, y1, z0], [x1, y1 + t, z1]));
  return uni(l);
}

function bandeja() {
  let s = box([-86, -86, Z.bot], [86, 86, Z.seam]).subtract(box([-76.2, -76.2, Z.piso], [76.2, 76.2, Z.seam + 1]));
  s = s.union(uni(esq.map(([x, y]) => zcyl(x, y, Z.piso - 0.2, -37, 3.6, 24))));
  // labios que centran la tapa a presión; se cortan donde pasan el USB y el jack
  s = s.union(uni([box([-58, 75, Z.seam - 0.1], [58, 75.7, -21]), box([-58, -75.7, Z.seam - 0.1], [58, -75, -21]),
    box([75, -58, Z.seam - 0.1], [75.7, 58, -21]), box([-75.7, -58, Z.seam - 0.1], [-75, 58, -21])]));
  s = s.union(guias(modulos.shield.a, modulos.shield.b, ['y-', 'x-']));
  s = s.union(guias(modulos.proto.a, modulos.proto.b, ['x-', 'y-']));
  s = s.union(guias(modulos.lm2596.a, modulos.lm2596.b, ['y-', 'y+']));
  s = s.union(guias(modulos.rele.a, modulos.rele.b, ['x-', 'x+', 'y-', 'y+']));
  // amarres: dos postes con paso para una brida
  const amarres = [[-36, 2], [12, -16], [60, -6], [-20, -30]];
  s = s.union(uni(amarres.flatMap(([x, y]) => [box([x - 4.5, y - 1.5, Z.piso - 0.2], [x - 1.5, y + 1.5, Z.piso + 7]), box([x + 1.5, y - 1.5, Z.piso - 0.2], [x + 4.5, y + 1.5, Z.piso + 7])])));
  const h = esq.flatMap(([x, y]) => [zcyl(x, y, Z.bot - 1, -36, 1.7, 24), zcyl(x, y, Z.bot - 1, Z.bot + 2.6, 3.2, 24)]);
  h.push(box([USBX - 7.5, 74, -31], [USBX + 7.5, 87, -20]));                 // ranura USB
  h.push(box([JACKX - 8, 75, Z.piso], [JACKX + 8, 83.5, -25.5]));            // bolsillo de la tuerca del jack
  h.push(ycyl(JACKX, -33, 83, 87, 4.1));                                     // paso del jack
  return s.subtract(uni(h));
}

function tapa() {
  let s = box([-79, -79, Z.seam], [79, 79, Z.top]).subtract(box([-76, -76, Z.seam - 1], [76, 76, Z.techo]));
  // columnas de esquina, unidas a las dos paredes
  const add = esq.map(([x, y]) => box([x > 0 ? 69 : -76.4, y > 0 ? 69 : -76.4, -36.8], [x > 0 ? 76.4 : -69, y > 0 ? 76.4 : -69, Z.techo + 0.2]));
  // soporte del servo en U, colgado del techo y abierto por abajo para librar el relé
  add.push(box([-8.5, -47.1, -18.6], [27.7, -44.1, Z.techo + 0.2]).subtract(box([-2.6, -48, -19], [21.8, -43, -5.2])));
  add.push(box([-8.5, -44.2, -14], [-6.9, -38, Z.techo + 0.2]), box([26.1, -44.2, -14], [27.7, -38, Z.techo + 0.2]));
  // PIR: dos postes a 28 mm, como los agujeros de su placa
  add.push(zcyl(PIR.x - 14, PIR.y, -5, Z.techo + 0.2, 2.5, 20), zcyl(PIR.x + 14, PIR.y, -5, Z.techo + 0.2, 2.5, 20));
  // anillo del buzzer
  add.push(zcyl(BUZ.x, BUZ.y, -9, Z.techo + 0.2, 13.4, 40).subtract(zcyl(BUZ.x, BUZ.y, -10, Z.techo + 1, 11.9, 40)));
  s = s.union(uni(add));
  const h = [];
  esq.forEach(([x, y]) => h.push(zcyl(x, y, -38, -16, 1.3, 20)));
  h.push(box([SRV.x - 25.5, -35.3, Z.techo - 1], [SRV.x + 5.5, -29.7, 1]));                      // ranura del pestillo
  h.push(box([22, -44, Z.techo - 1], [34, -36, 1]), box([-44, -36, Z.techo - 1], [-36, -24, 1])); // pasos de cables a la casa
  h.push(zcyl(PIR.x, PIR.y, Z.techo - 1, 1, 11.8, 48));
  h.push(zcyl(PIR.x - 14, PIR.y, -6, Z.techo - 0.5, 0.8, 12), zcyl(PIR.x + 14, PIR.y, -6, Z.techo - 0.5, 0.8, 12));
  h.push(ycyl(-4.3, SRV.z, -48, -43, 0.85, 12), ycyl(23.5, SRV.z, -48, -43, 0.85, 12));          // tornillos del servo
  h.push(zcyl(PIV.x, PIV.y, -2, 1, 1, 16));                                                      // pie de la bisagra
  h.push(copo(BUZ.x, BUZ.y, 11, Z.techo - 1, 1), copo(GAS.x, GAS.y, 10, Z.techo - 1, 1));
  // encaje de 1 mm para las paredes, sin cruzar el umbral
  h.push(box([-50.3, -50.3, -1], [50.3, 50.3, 1]).subtract(box([-44.7, -44.7, -2], [44.7, 44.7, 2])).subtract(box([-11.2, -52, -2], [11.2, -44, 2])));
  for (let i = 0; i < 6; i++) h.push(box([26 + i * 4.4, 75, -20], [28.2 + i * 4.4, 80, -7]));     // ventilación trasera
  h.push(box([USBX - 7.5, 75, Z.seam - 1], [USBX + 7.5, 80, -20]));                              // ranura USB
  h.push(ycyl(-45, -13, -76.5, -78, 5));                                                         // tapón de 1 mm para una cámara
  return s.subtract(uni(h));
}

function paredes() {
  // el original trae un escalón de 0,01 mm en z = 0: se recorta y se rehace con un faldón
  let s = orig('02_paredes').intersect(box([-60, -60, 0.5], [60, 60, 70]));
  s = s.subtract(box([-45, -45, 0], [45, 45, 4]));
  s = s.subtract(box([-10, -51, 0], [10.5, -44, 38.01]));
  s = s.union(box([-50, -50, -1], [50, 50, 0.6]).subtract(box([-45, -45, -2], [45, 45, 1])).subtract(box([-10.5, -52, -2], [10.5, -44, 1])));
  return s.subtract(zcyl(PIV.x, PIV.y, 37, 61, 1, 16));
}

const esHoja = (q) => q.ps.some((p) => p.v.some((v) => v[2] < 1));
function puerta() {
  const h = islas('04_puerta_corona').find(esHoja);
  let s = h.union(box([-9.5, -46.5, 0.5], [9.7, -45, 37.6]));
  s = s.intersect(box([-9.5, -60, 0.5], [9.7, -45, 37.6]));
  // placa para el imán del MC-38; la aleta que pasa la jamba hace de tope y no roza la pared
  s = s.union(box([-4, -45.05, 3], [10.3, -43, 33])).union(box([10.2, -44.9, 3], [12.5, -43, 33]));
  // biseles para que los cantos no rocen las jambas al girar
  s = s.subtract(prism([[9.43, -51.9], [9.8, -51.9], [9.8, -50.8], [9.7, -50.8]], -1, 40));
  s = s.subtract(prism([[-9.6, -46], [-8.2, -44.9], [-9.6, -44.9]], -1, 40));
  return s.subtract(zcyl(PIV.x, PIV.y, -1, 40, 1.1, 20));                // paso del pasador de 2 mm
}
function corona() {
  // se corta por el frente de la hoja; el plano se busca lejos de los vértices del toro
  const toro = islas('04_puerta_corona').find((q) => !esHoja(q));
  for (const y of [-51.8, -51.65, -51.55, -51.45, -51.3]) {
    const s = toro.intersect(box([-20, -60, 0], [20, y, 60])); const r = auditar(s.mesh());
    if (r.abiertas === 0 && r.dobles === 0) return s;
  }
  return toro;
}
function pestillo() {
  const { x, z } = SRV, y0 = SRV.yArm - ARM.grosor / 2, y1 = SRV.yArm + ARM.grosor / 2, w = ARM.ancho / 2, L = ARM.largo;
  const s = uni([ycyl(x, z, y0, y1, 7, 32), box([x - w, y0, z], [x + w, y1, z + L - w]), ycyl(x, z + L - w, y0, y1, w, 24)]);
  // alojamiento del brazo de serie del servo, que se pega aquí
  const hu = uni([ycyl(x, z, y0 - 1, y0 + 1.6, 3.9, 24), box([x - 2.8, y0 - 1, z], [x + 2.8, y0 + 1.6, z + 17])]);
  return s.subtract(hu).subtract(ycyl(x, z, y0, y1 + 1, 2.2, 20));
}
function asiento() {
  // y = ±49,4 coincide con la pendiente interior del tejado a z = 62,4
  let s = box([-57.6, -49.4, 60], [57.6, 49.4, 62.4]).subtract(box([-43.2, -43.2, 59], [43.2, 43.2, 63]));
  return s.union(box([-44.6, -44.6, 56], [44.6, 44.6, 60.1]).subtract(box([-43.2, -43.2, 55], [43.2, 43.2, 61])));
}
function chimenea() {
  // se recorta por el plano de la nieve del tejado para apoyar sin huecos
  const m = 37.0065 / 63.7334;
  const corte = prism([[-2, 99.0065 + 2 * m], [40, 99.0065 - 40 * m], [40, 0], [-2, 0]], -60, 10).xf(([u, v, w]) => [w, u, v]);
  return orig('06_chimenea').subtract(corte);
}

export const PIEZAS = {
  bandeja: { f: bandeja, nom: 'Bandeja', col: 'nieve' },
  tapa: { f: tapa, nom: 'Tapa del jardín', col: 'nieve' },
  paredes: { f: paredes, nom: 'Paredes', col: 'madera' },
  marcos: { f: () => orig('03_ventanas_marcos'), nom: 'Marcos de ventana', col: 'blanco' },
  puerta: { f: puerta, nom: 'Puerta', col: 'rojo' },
  corona: { f: corona, nom: 'Corona', col: 'verde' },
  pestillo: { f: pestillo, nom: 'Pestillo', col: 'gris' },
  asiento: { f: asiento, nom: 'Asiento del techo', col: 'madera' },
  techo: { f: () => orig('05_techo'), nom: 'Techo', col: 'rojo' },
  nieve_techo: { f: () => orig('07_nieve_techo'), nom: 'Nieve del techo', col: 'nieve' },
  chimenea: { f: chimenea, nom: 'Chimenea', col: 'ladrillo' },
  arbol_grande: { f: () => orig('09_arbol_grande'), nom: 'Árbol grande', col: 'verde' },
  arbol_chico: { f: () => orig('10_arbol_chico'), nom: 'Árbol chico', col: 'verde' },
  muneco: { f: () => orig('11_muneco_nieve'), nom: 'Muñeco de nieve', col: 'nieve' },
  caminito: { f: () => orig('12_caminito').intersect(box([-20, -78.9, -1], [20, -52.3, 5])), nom: 'Caminito', col: 'piedra' },
  regalos: { f: () => orig('13_regalos'), nom: 'Regalos', col: 'oro' },
  vidrio: { f: () => box([-8.8, -0.6, -8.8], [8.8, 0.6, 8.8]), nom: 'Vidrio esmerilado (× 5)', col: 'vidrio' },
};

if (process.argv[1].endsWith('parts.mjs')) {
  mkdirSync(aqui('out/parts'), { recursive: true });
  const solo = process.argv[2]; const res = {}; let fallas = 0;
  for (const [id, p] of Object.entries(PIEZAS)) {
    if (solo && id !== solo) continue;
    const t0 = Date.now(); const m = p.f().mesh(); const a = auditar(m); res[id] = a;
    writeFileSync(aqui(`out/parts/${id}.json`), JSON.stringify({ v: m.v.flat().map((x) => +x.toFixed(3)), t: m.t }));
    const ok = a.abiertas === 0 && a.dobles === 0 && a.degen === 0; if (!ok) fallas++;
    console.log(`${ok ? 'OK   ' : 'FALLA'} ${id.padEnd(13)} tris ${String(a.tris).padStart(6)}  abiertas ${a.abiertas}  dobles ${a.dobles}  vol ${(a.vol / 1000).toFixed(1).padStart(6)} cm3  caja ${a.hi.map((v, i) => (v - a.lo[i]).toFixed(1)).join(' x ')}  ${Date.now() - t0} ms`);
  }
  if (!solo) writeFileSync(aqui('out/auditoria.json'), JSON.stringify(res));
  console.log(fallas ? `${fallas} piezas con errores` : 'Todas las piezas son estancas.');
}
