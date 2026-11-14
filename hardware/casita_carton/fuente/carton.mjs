// Casita IoT de cartón: todas las piezas y la electrónica salen de aquí, en mm.
// z = 0 es el jardín (cara de arriba de la tapa); +y es la parte trasera; +x, la derecha.
// Cada sólido es un contorno plano (u, v) extruido th mm a lo largo de N = U × V desde el punto o.
// Las medidas exteriores del modelo casita_iot se mantienen; lo que depende del grosor t se recalcula.

export const GROSORES = [2, 3, 4];
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
const neg = (v) => v.map((c) => -c);
export const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const rect = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
export const circulo = (cu, cv, r, n = 40) => Array.from({ length: n }, (_, i) => [cu + r * Math.cos((2 * Math.PI * i) / n), cv + r * Math.sin((2 * Math.PI * i) / n)]);
const agC = (cu, cv, r, extra = {}) => ({ pts: circulo(cu, cv, r), c: [cu, cv], r, ...extra });
const agR = (u0, v0, u1, v1, extra = {}) => ({ pts: rect(u0, v0, u1, v1), ...extra });
const sol = (o, U, V, th, extra = {}) => ({ o, U, V, N: cruz(U, V), th, ...extra });
const cotaH = (u0, u1, v, d) => ({ a: [u0, v], b: [u1, v], off: [0, d] });
const cotaV = (v0, v1, u, d) => ({ a: [u, v0], b: [u, v1], off: [d, 0] });
const mover = (pts, du, dv) => pts.map(([u, v]) => [u + du, v + dv]);

// Rejilla de 7 agujeros de 3,5 mm: uno al centro y seis en un círculo de 8,5 mm
const rejilla = (cu, cv, giro = 0, extra = {}) => [agC(cu, cv, 1.75, extra), ...Array.from({ length: 6 }, (_, k) => {
  const a = giro + (k * Math.PI) / 3; return agC(cu + 8.5 * Math.cos(a), cv + 8.5 * Math.sin(a), 1.75, extra);
})];

// Copo de nieve: seis brazos con un rombo; los agujeros de la rejilla caen entre los brazos
export function copo(cu, cv, giro) {
  const pts = [], w = 1, L = 10.5;
  for (let k = 0; k < 6; k++) {
    const th = giro + (k * Math.PI) / 3, d = [Math.cos(th), Math.sin(th)], p = [-d[1], d[0]];
    const P = (r, s) => [cu + r * d[0] + s * p[0], cv + r * d[1] + s * p[1]];
    const ent = th - Math.PI / 6;
    pts.push([cu + 2 * w * Math.cos(ent), cv + 2 * w * Math.sin(ent)]);
    pts.push(P(5.2, -w), P(7, -2), P(8.8, -w), P(L - 0.8, -w), P(L, 0), P(L - 0.8, w), P(8.8, w), P(7, 2), P(5.2, w));
  }
  return pts;
}

// Árbol de tres pisos, de perfil: medio ancho por altura, de abajo hacia arriba
function perfilArbol(k) {
  return [[4, 0], [4, 5 * k], [11 * k, 5 * k], [5.5 * k, 12.5 * k], [8.5 * k, 12.5 * k], [4 * k, 19.5 * k], [6 * k, 19.5 * k], [0, 31 * k]];
}
function estrella(cu, cv, r = 4, ri = 1.7) {
  return Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? ri : r; return [cu + rr * Math.cos(a), cv + rr * Math.sin(a)]; });
}

// Goteo de la nieve: ondas de 16 mm con gotas de 3 a 6 mm
function goteo(u) {
  const prof = [4, 6, 3, 5, 4, 6, 3, 5];
  const i = Math.min(7, Math.floor(u / 16)), x = (u - i * 16) / 16;
  return x > 0.2 && x < 0.8 ? prof[i] * Math.sin(((x - 0.2) / 0.6) * Math.PI) : 0;
}

export function modelo(t = 3) {
  const a = 79 - t;               // cara interior de las paredes de la tapa
  const f = -42 + t;              // cara de arriba del piso de la bandeja
  const T = 160 + 4 * t;          // lado exterior de la bandeja: tapa de 158 + 1 mm de juego por lado + dos capas de pared
  const hT = 18 - t;              // alto de las tiras de la bandeja
  const hC = 42 - 2 * t;          // alto de las paredes de la tapa (apoyan en el piso de la bandeja)
  const nCalza = Math.ceil(7 / t), calza = nCalza * t;
  const SL = Math.hypot(62, 36), cA = 62 / SL, sA = 36 / SL, tA = 36 / 62;
  const z0 = 60 + t;              // cara de arriba de la base del techo
  const Ws = 76;                  // ancho de cada faldón: 71,7 mm hasta el borde + 4,3 mm de alero
  const zA = z0 + 36 + t / cA;    // cumbrera exterior de los faldones
  const Ln = Ws + t * tA + 1;     // nieve: desde la cumbrera hasta 1 mm más allá del faldón
  const zNieve = (y) => zA + 2 / cA - Math.abs(y) * tA;
  const zChim = zA + 2 / cA + 6;
  const xs = 17, ys = -50 + t + 1 + 6.1; // eje del servo
  const piv = [-9.75, -50 + t];          // bisagra de cinta: borde interior de la jamba izquierda
  const zu = f + calza + 14.7;           // centro del USB del ESP32
  const cxE = -a + 0.5 + 31.5;           // centro del shield en x
  const zMq = -12 - t / 2;               // centro de la rejilla lateral del MQ-2

  const piezas = [];
  const pieza = (p) => { p.solidos = p.solidos.map((s) => ({ contorno: p.forma.contorno, agujeros: p.forma.agujeros || [], ...s })); piezas.push(p); return p; };

  // ── Bandeja: piso y dos capas de tiras. La capa interior guía la tapa con 1 mm de juego por lado.
  pieza({ id: 'b_piso', nom: 'Piso de la bandeja', mat: 'corrugado', col: 'nieve', cant: 1, grupo: 'bandeja',
    forma: { contorno: rect(0, 0, T, T), cotas: [cotaH(0, T, 0, -8), cotaV(0, T, 0, -8)] },
    solidos: [sol([-T / 2, -T / 2, -42], X, Y, t)] });
  const muesca = (L, h) => {
    const r = 13, cy = h + 5, a0 = Math.atan2(-5, 12), a1 = Math.atan2(-5, -12), pts = [[0, 0], [L, 0], [L, h]];
    for (let i = 0; i <= 16; i++) { const ang = a0 + ((a1 - a0) * i) / 16; pts.push([L / 2 + r * Math.cos(ang), cy + r * Math.sin(ang)]); }
    pts.push([0, h]); return pts;
  };
  const tira = (id, nom, L, notch, sols, nota) => pieza({ id, nom, mat: 'corrugado', col: 'nieve', cant: 2, grupo: 'bandeja', nota, plantilla: notch,
    forma: { contorno: notch ? muesca(L, hT) : rect(0, 0, L, hT), cotas: [cotaH(0, L, 0, -6), cotaV(0, hT, L, 6), ...(notch ? [cotaH(L / 2 - 12, L / 2 + 12, hT, 5)] : [])],
      rotulos: notch ? [{ p: [L / 2, hT / 2 - 3], txt: 'muesca para levantar la tapa' }] : [] },
    solidos: sols });
  const Ti = T - 2 * t;
  tira('b_ext_fa', 'Tira exterior, frente y atrás', T, false, [sol([-T / 2, -T / 2 + t, f], X, Z, t), sol([T / 2, T / 2 - t, f], neg(X), Z, t)]);
  tira('b_ext_la', 'Tira exterior, lados', T - 2 * t, true, [sol([T / 2 - t, -T / 2 + t, f], Y, Z, t), sol([-T / 2 + t, T / 2 - t, f], neg(Y), Z, t)], 'Va entre las tiras de frente y atrás.');
  tira('b_int_fa', 'Tira interior, frente y atrás', Ti, false, [sol([-Ti / 2, -Ti / 2 + t, f], X, Z, t), sol([Ti / 2, Ti / 2 - t, f], neg(X), Z, t)], 'Se pega por dentro de la capa exterior.');
  tira('b_int_la', 'Tira interior, lados', Ti - 2 * t, true, [sol([Ti / 2 - t, -Ti / 2 + t, f], Y, Z, t), sol([-Ti / 2 + t, Ti / 2 - t, f], neg(Y), Z, t)], 'Su cara interior debe quedar a 160 mm de la del otro lado.');

  // ── Tapa: es el jardín. Sus paredes bajan por dentro de la bandeja hasta el piso.
  const L0 = (x, y) => [x + 79, y + 79];
  const [pu, pv] = L0(42, -62);
  const [bu, bv] = L0(62, 30);
  const agTapa = [
    agC(pu, pv, 11.8, { nom: 'PIR', lab: 'dentro' }),
    agR(xs - 6.4 + 79, ys - 6.6 + 79, xs + 17.6 + 79, ys + 6.6 + 79, { nom: 'Servo', lab: 'dentro' }),
    ...rejilla(bu, bv, 0, { grupoNom: 'Buzzer', labP: [157, bv - 14], ancla: 'end' }),
    agC(...L0(-42, 6), 4, { nom: 'Cables SW-420', lab: 'der' }),
    agC(...L0(41, -26), 4, { nom: 'Cables reed', lab: 'izq' }),
  ];
  const cruzArbol = (x, y, r) => { const [u, v] = L0(x, y); return [{ pts: [[u - r, v], [u + r, v]] }, { pts: [[u, v - r], [u, v + r]] }]; };
  pieza({ id: 't_techo', nom: 'Tapa: jardín', mat: 'corrugado', col: 'nieve', cant: 1, grupo: 'tapa', plantilla: true, pos: true,
    nota: 'Corten los agujeros antes de pegar las paredes. Las líneas punteadas son marcas de lápiz para ubicar la casa y la decoración.',
    forma: {
      contorno: rect(0, 0, 158, 158), agujeros: agTapa,
      marcas: [{ pts: rect(29, 29, 129, 129), cerrado: true }, { pts: rect(69, 0, 89, 28.5), cerrado: true },
        ...cruzArbol(66, -58, 11), ...cruzArbol(-66, -60, 8.25), { pts: circulo(...L0(-62, 40), 7.5, 24), cerrado: true },
        { pts: rect(35, 9, 43, 17), cerrado: true }, { pts: rect(46, 4, 52, 10), cerrado: true },
        { pts: copo(...L0(-62, -22), Math.PI / 6), cerrado: true }, { pts: copo(bu, bv, Math.PI / 6), cerrado: true }],
      rotulos: [{ p: [79, 136], txt: 'casa: 100 × 100' }, { p: [79, 33], txt: 'frente de la casa' }, { p: [79, -14], txt: 'FRENTE' },
        { p: L0(66, -58 - 15), txt: 'árbol grande' }, { p: L0(-66, -60 - 12), txt: 'árbol chico' }, { p: L0(-62, 40 + 11), txt: 'muñeco' },
        { p: [47, 20], txt: 'regalos' }, { p: [79, 14], txt: 'caminito' }, { p: [146, bv + 15], txt: 'buzzer bajo el copo' },
        { p: L0(-62, -22 + 14), txt: 'copo decorativo' }],
      cotas: [cotaH(0, 158, 0, -8), cotaV(0, 158, 0, -8), cotaH(0, 29, 150, 0), cotaV(0, 29, 100, 0)],
    },
    solidos: [sol([-79, -79, -t], X, Y, t)] });

  const usb = agR(79 - cxE - 6.5, zu - 4.5 - f, 79 - cxE + 6.5, zu + 4.5 - f, { nom: 'USB', verificar: true });
  const jack = agC(79 - 60, -13 - f, 4, { nom: 'Jack', verificar: true });
  const bordeBandeja = { pts: [[0, -24 - f], [158, -24 - f]] };
  pieza({ id: 't_pared_fr', nom: 'Tapa: pared del frente', mat: 'corrugado', col: 'nieve', cant: 1, grupo: 'tapa',
    forma: { contorno: rect(0, 0, 158, hC), cotas: [cotaH(0, 158, 0, -6), cotaV(0, hC, 158, 6)] },
    solidos: [sol([-79, -79 + t, f], X, Z, t)] });
  pieza({ id: 't_pared_at', nom: 'Tapa: pared trasera', mat: 'corrugado', col: 'nieve', cant: 1, grupo: 'tapa', plantilla: true, pos: true,
    nota: 'Vista desde atrás. Marquen el USB con el ESP32 en su lugar: la altura depende del shield.',
    forma: { contorno: rect(0, 0, 158, hC), agujeros: [usb, jack], marcas: [bordeBandeja],
      rotulos: [{ p: [80, -24 - f - 2.5], txt: 'borde de la bandeja' }],
      cotas: [cotaH(0, 158, 0, -6), cotaV(0, hC, 158, 6)] },
    solidos: [sol([79, 79 - t, f], neg(X), Z, t)] });
  pieza({ id: 't_pared_de', nom: 'Tapa: pared derecha', mat: 'corrugado', col: 'nieve', cant: 1, grupo: 'tapa',
    forma: { contorno: rect(0, 0, 158 - 2 * t, hC), cotas: [cotaH(0, 158 - 2 * t, 0, -6), cotaV(0, hC, 158 - 2 * t, 6)] },
    solidos: [sol([79 - t, -79 + t, f], Y, Z, t)] });
  pieza({ id: 't_pared_iz', nom: 'Tapa: pared izquierda', mat: 'corrugado', col: 'nieve', cant: 1, grupo: 'tapa', plantilla: true,
    nota: 'La rejilla es para el MQ-2 opcional: córtenla solo si lo usan.',
    forma: { contorno: rect(0, 0, 158 - 2 * t, hC), agujeros: rejilla(101 - t, zMq - f, Math.PI / 6, { opcional: true, grupoNom: 'MQ-2', labP: [101 - t + 12, zMq - f + 1.5], ancla: 'start' }), marcas: [{ pts: [[0, -24 - f], [158 - 2 * t, -24 - f]] }],
      rotulos: [{ p: [101 - t, zMq - f + 13], txt: 'rejilla MQ-2 (opcional)' }],
      cotas: [cotaH(0, 158 - 2 * t, 0, -6), cotaV(0, hC, 158 - 2 * t, 6)] },
    solidos: [sol([-79 + t, 79 - t, f], neg(Y), Z, t)] });
  pieza({ id: 'calza', nom: 'Calza del shield', mat: 'corrugado', col: 'carton', cant: nCalza, grupo: 'bandeja',
    nota: `${nCalza} capas pegadas (${calza} mm): suben el USB del ESP32 por encima del borde de la bandeja.`,
    forma: { contorno: rect(0, 0, 63, 66), cotas: [cotaH(0, 63, 0, -6), cotaV(0, 66, 63, 6)] },
    solidos: Array.from({ length: nCalza }, (_, k) => sol([-a + 0.5, a - 66.5, f + k * t], X, Y, t)) });

  // ── Casa: frente y fondo de 100 mm; los lados van entre ellos.
  const Ls = 100 - 2 * t;
  const cadenaH = (cortes, v, d) => cortes.slice(1).map((u, i) => cotaH(cortes[i], u, v, d));
  const cadenaV = (cortes, u, d) => cortes.slice(1).map((v, i) => cotaV(cortes[i], v, u, d));
  pieza({ id: 'c_frente', nom: 'Casa: pared del frente', mat: 'corrugado', col: 'madera', cant: 1, grupo: 'casa', plantilla: true,
    nota: 'Vista desde afuera. La puerta se corta y se guarda: es la hoja. Las marcas punteadas van por dentro.',
    forma: { contorno: rect(0, 0, 100, 60),
      agujeros: [agR(40, 3, 60, 38, { nom: 'Puerta', guardar: true }), agR(13, 25, 31, 43, { nom: 'Ventana' }), agR(69, 25, 87, 43, { nom: 'Ventana' })],
      marcas: [{ pts: rect(39, 39.5, 67, 53.5), cerrado: true }, { pts: rect(35, 3.5, 40, 22), cerrado: true }, { pts: rect(60, 23.5, 68.5, 37.5), cerrado: true }],
      rotulos: [{ p: [53, 46.5], txt: 'reed (dentro)' }, { p: [50, 20.5], txt: 'puerta' }, { p: [50, 16.5], txt: 'guardar' }, { p: [50, 0.8], txt: 'umbral 3', tam: 0.75 }, { p: [27, 14], txt: 'bisagra →', tam: 0.75 }, { p: [77, 20], txt: '← tope del imán', tam: 0.75 }],
      cotas: [...cadenaH([0, 13, 31, 40, 60, 69, 87, 100], 60, 6), cotaH(0, 100, 0, -6), ...cadenaV([0, 25, 43, 60], 100, 6), cotaV(3, 38, 57, 0)] },
    solidos: [sol([-50, -50 + t, 0], X, Z, t)] });
  pieza({ id: 'c_fondo', nom: 'Casa: pared del fondo', mat: 'corrugado', col: 'madera', cant: 1, grupo: 'casa', plantilla: true,
    forma: { contorno: rect(0, 0, 100, 60), agujeros: [agR(41, 25, 59, 43, { nom: 'Ventana' })],
      cotas: [...cadenaH([0, 41, 59, 100], 60, 6), cotaH(0, 100, 0, -6), ...cadenaV([0, 25, 43, 60], 100, 6)] },
    solidos: [sol([50, 50 - t, 0], neg(X), Z, t)] });
  pieza({ id: 'c_lado_de', nom: 'Casa: pared derecha', mat: 'corrugado', col: 'madera', cant: 1, grupo: 'casa', plantilla: true,
    nota: 'Va entre el frente y el fondo.',
    forma: { contorno: rect(0, 0, Ls, 60), agujeros: [agR(41 - t, 25, 59 - t, 43, { nom: 'Ventana' })],
      cotas: [...cadenaH([0, 41 - t, 59 - t, Ls], 60, 6), cotaH(0, Ls, 0, -6), ...cadenaV([0, 25, 43, 60], Ls, 6)] },
    solidos: [sol([50 - t, -50 + t, 0], Y, Z, t)] });
  pieza({ id: 'c_lado_iz', nom: 'Casa: pared izquierda', mat: 'corrugado', col: 'madera', cant: 1, grupo: 'casa', plantilla: true,
    nota: 'Va entre el frente y el fondo. El SW-420 se pega por dentro, junto al frente.',
    forma: { contorno: rect(0, 0, Ls, 60), agujeros: [agR(41 - t, 25, 59 - t, 43, { nom: 'Ventana' })],
      marcas: [{ pts: rect(66 - 2 * t, 5, 98 - 2 * t, 19), cerrado: true }], rotulos: [{ p: [82 - 2 * t, 10.5], txt: 'SW-420 (dentro)' }],
      cotas: [...cadenaH([0, 41 - t, 59 - t, Ls], 60, 6), cotaH(0, Ls, 0, -6), ...cadenaV([0, 25, 43, 60], Ls, 6)] },
    solidos: [sol([-50 + t, 50 - t, 0], neg(Y), Z, t)] });
  pieza({ id: 'c_puerta', nom: 'Hoja de la puerta', mat: 'corrugado', col: 'rojo', cant: 1, grupo: 'puerta',
    nota: 'Sale del hueco de la pared del frente: recórtenla 0,5 mm por lado.',
    forma: { contorno: rect(0, 0, 19, 34), cotas: [cotaH(0, 19, 0, -5), cotaV(0, 34, 19, 5)] },
    solidos: [sol([-9.5, -50 + t, 3.5], X, Z, t)] });

  // ── Detalles de cartulina sobre la casa
  const marcoVentana = [[0, 0], [28, 0], [28, 2.5], [26.5, 2.5], [26.5, 26.5], [1.5, 26.5], [1.5, 2.5], [0, 2.5]];
  pieza({ id: 'marco_v', nom: 'Marco de ventana', mat: 'cartulina', col: 'blanco', cant: 5, grupo: 'casa', plantilla: true,
    forma: { contorno: marcoVentana, agujeros: [agR(5, 5, 13.2, 13.2), agR(14.8, 5, 23, 13.2), agR(5, 14.8, 13.2, 23), agR(14.8, 14.8, 23, 23)],
      cotas: [cotaH(0, 28, 0, -5), cotaV(0, 26.5, 28, 5)] },
    solidos: [sol([-42, -50, 20], X, Z, 0.5), sol([14, -50, 20], X, Z, 0.5), sol([14, 50, 20], neg(X), Z, 0.5), sol([50, -14, 20], Y, Z, 0.5), sol([-50, 14, 20], neg(Y), Z, 0.5)] });
  pieza({ id: 'marco_p', nom: 'Marco de la puerta', mat: 'cartulina', col: 'blanco', cant: 1, grupo: 'casa', plantilla: true,
    forma: { contorno: [[0, 0], [3, 0], [3, 38], [23, 38], [23, 0], [26, 0], [26, 41], [0, 41]], cotas: [cotaH(0, 26, 41, 5), cotaV(0, 41, 26, 5), cotaH(3, 23, 19, 0)] },
    solidos: [sol([-13, -50, 0], X, Z, 0.5)] });
  const vid = (o, U, w) => sol(o, U, Z, 0.2, { contorno: rect(0, 0, w, 20) });
  pieza({ id: 'vidrio', nom: 'Vidrio', mat: 'acetato', col: 'vidrio', cant: 5, grupo: 'casa',
    nota: 'Papel vegetal o acetato lijado: deja pasar luz y oculta los sensores. Los dos del frente miden 19,5 × 20.',
    forma: { contorno: rect(0, 0, 20, 20), cotas: [cotaH(0, 20, 0, -5), cotaV(0, 20, 20, 5)] },
    solidos: [vid([-38, -50 + t + 0.2, 24], X, 19.5), vid([18.5, -50 + t + 0.2, 24], X, 19.5), vid([10, 50 - t - 0.2, 24], neg(X), 20),
      vid([50 - t - 0.2, -10, 24], Y, 20), vid([-50 + t + 0.2, 10, 24], neg(Y), 20)] });
  const moño = [[7, 0.6], [4.2, -1.6], [3.6, 0.6], [4.2, 2.6], [7, 1.2], [9.8, 2.6], [10.4, 0.6], [9.8, -1.6]];
  pieza({ id: 'corona', nom: 'Corona', mat: 'cartulina', col: 'verde', cant: 1, grupo: 'puerta', plantilla: true,
    nota: 'Lleva un moño rojo abajo.',
    forma: { contorno: circulo(7, 7, 7, 36), agujeros: [agC(7, 7, 3.5)], cotas: [cotaH(0, 14, 7, 0)] },
    solidos: [sol([-7, -50, 21], X, Z, 0.5)] });
  pieza({ id: 'lazo', nom: 'Moño de la corona', mat: 'cartulina', col: 'rojo', cant: 1, grupo: 'puerta', plantilla: true,
    forma: { contorno: moño }, solidos: [sol([-7, -50.5, 21], X, Z, 0.5)] });

  // ── Techo desmontable: base, tapón que lo centra, dos tímpanos y dos faldones
  const sTap = 100 - 2 * t - 1;
  pieza({ id: 'r_base', nom: 'Techo: base', mat: 'corrugado', col: 'rojo', cant: 1, grupo: 'techo',
    forma: { contorno: rect(0, 0, 124, 124), cotas: [cotaH(0, 124, 0, -6), cotaV(0, 124, 124, 6)] },
    solidos: [sol([-62, -62, 60], X, Y, t)] });
  pieza({ id: 'r_tapon', nom: 'Techo: tapón', mat: 'corrugado', col: 'carton', cant: 1, grupo: 'techo',
    nota: 'Va pegado bajo la base, centrado: entra en la casa con 0,5 mm de juego y evita que el techo se corra.',
    forma: { contorno: rect(0, 0, sTap, sTap), cotas: [cotaH(0, sTap, 0, -6), cotaV(0, sTap, sTap, 6)] },
    solidos: [sol([-sTap / 2, -sTap / 2, 60 - t], X, Y, t)] });
  pieza({ id: 'r_timpano', nom: 'Techo: tímpano', mat: 'corrugado', col: 'rojo', cant: 2, grupo: 'techo', plantilla: true,
    nota: 'Uno en cada extremo de la base, al ras del borde.',
    forma: { contorno: [[0, 0], [124, 0], [62, 36]], cotas: [cotaH(0, 124, 0, -6), cotaV(0, 36, 62, 0)] },
    solidos: [sol([62 - t, -62, z0], Y, Z, t), sol([-62 + t, 62, z0], neg(Y), Z, t)] });
  const Vb = [0, cA, -sA], Vf = [0, -cA, -sA];
  pieza({ id: 'r_faldon', nom: 'Techo: faldón', mat: 'corrugado', col: 'rojo', cant: 2, grupo: 'techo',
    nota: 'Apoya en los tímpanos y sobresale 4 mm de la base como alero.',
    forma: { contorno: rect(0, 0, 124, Ws), cotas: [cotaH(0, 124, 0, -6), cotaV(0, Ws, 124, 6)] },
    solidos: [sol([-62, 0, z0 + 36], X, Vb, t), sol([62, 0, z0 + 36], neg(X), Vf, t)] });
  const mitadNieve = [[0, 0], [128, 0]];
  for (let u = 128; u >= 0; u -= 1) mitadNieve.push([u, Ln + goteo(u)]);
  const Lm = Ln + 7, plantNieve = [];
  for (let u = 0; u <= 128; u += 1) plantNieve.push([u, Lm - Ln - goteo(u)]);
  for (let u = 128; u >= 0; u -= 1) plantNieve.push([u, Lm + Ln + goteo(u)]);
  pieza({ id: 'r_nieve', nom: 'Nieve del techo', mat: 'microporoso', col: 'nieve', cant: 1, grupo: 'techo', plantilla: true,
    nota: 'Una sola pieza que se dobla en la cumbrera y tapa la unión de los faldones.',
    forma: { contorno: plantNieve, pliegues: [[[0, Lm], [128, Lm]]], rotulos: [{ p: [64, Lm + 3], txt: 'doblar: cumbrera' }],
      cotas: [cotaH(0, 128, Lm - Ln - 6, -4), cotaV(Lm, Lm + Ln, 128, 6)] },
    solidos: [sol([-64, 0, zA], X, Vb, 2, { contorno: mitadNieve }), sol([64, 0, zA], neg(X), Vf, 2, { contorno: mitadNieve })] });
  const hf = zChim - zNieve(5), hb = zChim - zNieve(23), H = hb;
  const red = [[0, H - hf], [18, H - hf], [36, 0], [54, 0], [72, H - hf], [72, H - hf + 1], [77, H - hf + 2.5], [77, H - 2.5], [72, H - 1], [72, H], [0, H]];
  const ladrillos = [];
  for (let v = H - 4, fila = 0; v > 0.5; v -= 4, fila++) {
    ladrillos.push({ pts: [[0, v], [72, v]], recortar: true });
    for (let u = fila % 2 ? 3 : 0; u < 72; u += 6) ladrillos.push({ pts: [[u, v], [u, v + 4]], recortar: true });
  }
  pieza({ id: 'r_chimenea', nom: 'Chimenea', mat: 'cartulina', col: 'ladrillo', cant: 1, grupo: 'techo', plantilla: true,
    nota: 'Se dobla en tubo de 18 × 18 mm; la pestaña va por dentro. El borde inclinado apoya en la pendiente de la nieve.',
    forma: { contorno: red, pliegues: [18, 36, 54, 72].map((u) => [[u, u === 72 ? H - hf : u === 18 ? H - hf : 0], [u, H]]), deco: ladrillos,
      cotas: [cotaH(0, 72, H, 5), cotaV(H - hf, H, 0, -5), cotaV(0, H, 45, 0)] },
    solidos: [sol([-37, 0, 0], Y, Z, 18, { contorno: [[5, zNieve(5)], [23, zNieve(23)], [23, zChim], [5, zChim]], agujeros: [] })] });
  pieza({ id: 'r_chim_tapa', nom: 'Chimenea: tapa', mat: 'corrugado', col: 'ladrillo', cant: 1, grupo: 'techo',
    forma: { contorno: rect(0, 0, 22, 22), cotas: [cotaH(0, 22, 0, -5), cotaV(0, 22, 22, 5)] },
    solidos: [sol([-39, 3, zChim], X, Y, t)] });

  // ── Jardín
  const arbol = (id, nom, cx, cy, k) => {
    const P = perfilArbol(k), W = 2 * P[2][0], Hh = P[P.length - 1][1];
    const A = [...P.map(([u, v]) => [W / 2 + u, v]), ...P.slice(0, -1).reverse().map(([u, v]) => [W / 2 - u, v])];
    const tope = Hh - (t / 2) * (Hh - P[6][1]) / P[6][0];
    const B = [[0, 0], ...P.slice(0, -1).map(([u, v]) => [u - t / 2, v]), [0, tope]];
    pieza({ id: `${id}_a`, nom: `${nom}: pieza A`, mat: 'corrugado', col: 'verde', cant: 1, grupo: 'jardin', plantilla: true,
      forma: { contorno: A, cotas: [cotaH(0, W, 0, -5), cotaV(0, Hh, W, 5)], rotulos: [{ p: [W / 2, Hh * 0.38], txt: 'A' }] },
      solidos: [sol([cx - W / 2, cy + t / 2, 0], X, Z, t)] });
    pieza({ id: `${id}_b`, nom: `${nom}: media pieza B`, mat: 'corrugado', col: 'verde', cant: 2, grupo: 'jardin', plantilla: true,
      nota: 'Una a cada lado de A, en cruz.',
      forma: { contorno: B, cotas: [cotaV(0, tope, 0, -5)], rotulos: [{ p: [B[3][0] * 0.45, Hh * 0.3], txt: 'B' }] },
      solidos: [sol([cx - t / 2, cy + t / 2, 0], Y, Z, t), sol([cx + t / 2, cy - t / 2, 0], neg(Y), Z, t)] });
    return { cx, cy, Hh };
  };
  const ag = arbol('arbol_g', 'Árbol grande', 66, -58, 1), ac = arbol('arbol_c', 'Árbol chico', -66, -60, 0.75);
  pieza({ id: 'estrella', nom: 'Estrella', mat: 'cartulina', col: 'oro', cant: 2, grupo: 'jardin', plantilla: true,
    forma: { contorno: estrella(4, 4) },
    solidos: [ag, ac].map((q) => sol([q.cx - 4, q.cy - t / 2, q.Hh - 2], X, Z, 0.5)) });
  const piedras = [];
  [7.1, 14.2, 21.3].forEach((v, i) => { piedras.push({ pts: [[0, v + (i % 2 ? 0.8 : -0.6)], [7, v], [13, v + 0.9], [20, v - 0.4]] }); });
  [[0, 7.1, 9], [1, 14.2, 6], [1, 14.2, 14], [2, 21.3, 10], [3, 28.5, 5], [3, 28.5, 14]].forEach(([i, v, u]) => piedras.push({ pts: [[u, v - 7.1], [u + 0.6, v]] }));
  pieza({ id: 'caminito', nom: 'Caminito', mat: 'cartulina', col: 'piedra', cant: 1, grupo: 'jardin', plantilla: true,
    nota: 'Las líneas de las piedras son solo dibujo: impriman esta hoja en cartulina gris o píntenlas.',
    forma: { contorno: rect(0, 0, 20, 28.5), deco: piedras, cotas: [cotaH(0, 20, 0, -5), cotaV(0, 28.5, 20, 5)] },
    solidos: [sol([-10, -79, 0], X, Y, 0.5)] });
  pieza({ id: 'copo', nom: 'Copo de nieve', mat: 'cartulina', col: 'blanco', cant: 2, grupo: 'jardin', plantilla: true,
    nota: 'Uno sobre la rejilla del buzzer, con el agujero central encima del agujero central; el otro es decorativo.',
    forma: { contorno: copo(11, 11, Math.PI / 6), agujeros: [agC(11, 11, 1.75)], cotas: [cotaH(11 - 10.5 * Math.cos(Math.PI / 6), 11 + 10.5 * Math.cos(Math.PI / 6), 0, -4)] },
    solidos: [[62, 30], [-62, -22]].map(([x, y]) => sol([x - 11, y - 11, 0], X, Y, 0.5)) });
  const n1 = Math.max(1, Math.round(8 / t)), n2 = Math.max(1, Math.round(6 / t));
  pieza({ id: 'regalo_g', nom: 'Regalo grande', mat: 'corrugado', col: 'oro', cant: n1, grupo: 'jardin', nota: `${n1} cuadrados pegados; luego se forran o se pintan.`,
    forma: { contorno: rect(0, 0, 8, 8), cotas: [cotaH(0, 8, 0, -4)] },
    solidos: Array.from({ length: n1 }, (_, k) => sol([-44, -70, k * t], X, Y, t)) });
  pieza({ id: 'regalo_c', nom: 'Regalo chico', mat: 'corrugado', col: 'rojo', cant: n2, grupo: 'jardin', nota: `${n2} cuadrados pegados.`,
    forma: { contorno: rect(0, 0, 6, 6), cotas: [cotaH(0, 6, 0, -4)] },
    solidos: Array.from({ length: n2 }, (_, k) => sol([-33, -75, k * t], X, Y, t)) });

  // Medidas a la vista para la tabla de corte
  for (const p of piezas) {
    const us = p.forma.contorno.map((q) => q[0]), vs = p.forma.contorno.map((q) => q[1]);
    p.ancho = Math.max(...us) - Math.min(...us); p.alto = Math.max(...vs) - Math.min(...vs);
    p.grosor = p.mat === 'corrugado' ? t : p.mat === 'microporoso' ? 2 : p.mat === 'acetato' ? 0.2 : 0.5;
  }

  // ── Electrónica. partes: lo que se dibuja; env: el volumen que se comprueba (cajas [a, b] o cilindros).
  const caja = (a0, b0, mat, nom) => ({ tipo: 'caja', a: a0, b: b0, mat, nom });
  const cil = (c, r, h0, h1, eje, mat, nom) => ({ tipo: 'cil', c, r, h0, h1, eje, mat, nom });
  const yS0 = a - 66.5, xS0 = -a + 0.5, zS = f + calza;
  const yP0 = a - 82.5;
  const xL0 = a - 21.5;
  const modulos = [
    { id: 'shield', nom: 'Shield con ESP32', grupo: 'bandeja', medida: '63 × 66 × 18 mm',
      nota: `Atrás a la izquierda, sobre la calza de ${calza} mm, con el USB contra la pared trasera.`,
      env: [caja([xS0, yS0, zS], [xS0 + 63, yS0 + 66, zS + 18])],
      partes: [caja([xS0, yS0, zS], [xS0 + 63, yS0 + 66, zS + 1.6], 'pcbNegro', 'Shield de borneras'),
        ...[xS0 + 1.5, xS0 + 59.5].flatMap((x) => Array.from({ length: 12 }, (_, i) => caja([x - 1.5, yS0 + 3 + i * 5.1, zS + 1.6], [x + 1.5, yS0 + 7.8 + i * 5.1, zS + 11.6], 'borneraAzul', 'Borneras del shield'))),
        ...[cxE - 13, cxE + 13].map((x) => caja([x - 1.3, yS0 + 13, zS + 1.6], [x + 1.3, a - 2.5, zS + 10.1], 'negro', 'Zócalos del ESP32')),
        caja([cxE - 14, yS0 + 12, zS + 10.1], [cxE + 14, a - 1.5, zS + 11.7], 'pcbNegro', 'ESP32 DevKit V1'),
        caja([cxE - 9, yS0 + 14, zS + 11.7], [cxE + 9, yS0 + 32, zS + 14.9], 'plata', 'Módulo ESP-WROOM-32'),
        caja([cxE - 3.8, a - 6, zu - 1.5], [cxE + 3.8, a - 0.5, zu + 1.5], 'plata', 'Puerto USB del ESP32')] },
    { id: 'proto', nom: 'Protoboard', grupo: 'bandeja', medida: '55 × 82 × 8,5 mm', nota: 'Al centro, contra la pared trasera. Reparte 5 V, 3,3 V y GND.',
      env: [caja([-10, yP0, f], [45, a - 0.5, f + 8.5])], partes: [caja([-10, yP0, f], [45, a - 0.5, f + 8.5], 'proto', 'Protoboard de 400 puntos')] },
    { id: 'cables', nom: 'Cables Dupont sobre la protoboard', grupo: 'bandeja', virtual: true, medida: 'hasta 26 mm sobre el piso',
      env: [caja([-10, yP0, f + 8.5], [45, a - 0.5, f + 26])], partes: [] },
    { id: 'c1', nom: 'Capacitor C1, 1000 µF', grupo: 'bandeja', medida: 'Ø 10 × 20 mm', nota: 'En la protoboard, junto a la llegada del LM2596.',
      env: [cil([38, a - 14], 5, f + 8.5, f + 28.5, 'z')], partes: [cil([38, a - 14], 5, f + 8.5, f + 28.5, 'z', 'capacitor', 'Capacitor C1, 1000 µF')] },
    { id: 'lm2596', nom: 'LM2596', grupo: 'bandeja', medida: '21 × 43 × 15 mm', nota: 'Atrás a la derecha. Ajústenlo a 5,0 V antes de conectar nada.',
      env: [caja([xL0, 10, f], [xL0 + 21, 53, f + 14.8])],
      partes: [caja([xL0, 10, f + 1.5], [xL0 + 21, 53, f + 3.1], 'pcbAzul', 'Convertidor LM2596'), cil([xL0 + 10.5, 26], 6.3, f + 3.1, f + 10.3, 'z', 'negro', 'Bobina del LM2596'),
        cil([xL0 + 6, 41], 3.2, f + 3.1, f + 12.1, 'z', 'negro', 'Capacitor del LM2596'), cil([xL0 + 15, 41], 3.2, f + 3.1, f + 12.1, 'z', 'negro', 'Capacitor del LM2596'),
        caja([xL0 + 7, 14, f + 3.1], [xL0 + 14, 19, f + 9], 'borneraAzul', 'Trimmer del LM2596: ajustar a 5,0 V')] },
    { id: 'jack', nom: 'Jack DC de 12 V', grupo: 'tapa', medida: 'Ø 8 mm de rosca', nota: 'En la pared trasera de la tapa, sobre el borde de la bandeja.',
      env: [cil([60, -13], 5, a - 22, a, 'y'), cil([60, -13], 6.3, 79, 81, 'y')],
      partes: [cil([60, -13], 5, a - 22, a, 'y', 'negro', 'Jack DC de 12 V'), cil([60, -13], 6.3, 79, 81, 'y', 'plata', 'Tuerca del jack')] },
    { id: 'rele', nom: 'Relé de 2 canales', grupo: 'bandeja', medida: '50 × 41 × 21 mm', nota: 'Adelante a la derecha, bajo el servo, con 2 mm de aire.',
      env: [caja([23, -48.5, f], [73, -7.5, f + 20.8])],
      partes: [caja([23, -48.5, f + 1.5], [73, -7.5, f + 3.1], 'pcbAzul', 'Módulo de relés de 2 canales'),
        ...[-45, -26].map((y0) => caja([36, y0, f + 3.1], [55, y0 + 15, f + 18.6], 'azulRele', 'Relé')),
        ...[-46, -27].map((y0) => caja([61, y0, f + 3.1], [71, y0 + 15, f + 13], 'borneraAzul', 'Borneras del relé (COM, NO, NC)')),
        caja([24, -37, f + 3.1], [26.6, -19, f + 11.6], 'negro', 'Entrada del relé (IN1, DC+, DC−)'), caja([28, -43, f + 3.1], [31, -39, f + 6], 'amarillo', 'Jumper en H')] },
    { id: 'pir', nom: 'PIR HC-SR501', grupo: 'tapa', medida: '32 × 24 mm, domo Ø 23 mm', nota: 'Pegado bajo el jardín con silicona por los bordes. El domo asoma como una bola de nieve.',
      env: [caja([26, -74, -t - 9.1], [58, -50, -t]), caja([38, -56, -t - 25], [46, -51, -t - 3.1]), cil([42, -62], 11.5, -t, -t + 11.5, 'z')],
      partes: [caja([26, -74, -t - 3.1], [58, -50, -t - 1.5], 'pcbVerde', 'PIR HC-SR501'), caja([30, -74, -t - 1.5], [54, -50, -t], 'lente', 'PIR HC-SR501'),
        caja([32, -70, -t - 9.1], [52, -54, -t - 3.1], 'negro', 'PIR: componentes'), caja([38, -56, -t - 25], [46, -51, -t - 3.1], 'negro', 'PIR: conector Dupont'),
        { tipo: 'domo', c: [42, -62, -t], r: 11.4, mat: 'lente', nom: 'Domo del PIR' }] },
    { id: 'buzzer', nom: 'Buzzer SFM-20B', grupo: 'tapa', medida: 'Ø 23 × 12 mm', nota: 'Pegado bajo el copo derecho, que hace de rejilla.',
      env: [cil([62, 30], 11.5, -t - 12, -t, 'z'), caja([59, 15, -t - 1.5], [65, 45, -t])],
      partes: [cil([62, 30], 11.5, -t - 12, -t, 'z', 'negro', 'Buzzer SFM-20B'), caja([59, 15, -t - 1.5], [65, 45, -t], 'negro', 'Orejas del buzzer')] },
    { id: 'mq2', nom: 'MQ-2 (opcional)', grupo: 'tapa', opcional: true, medida: '32 × 22 mm, sensor Ø 20 mm', nota: 'De pie contra la pared izquierda de la tapa, con el sensor frente a la rejilla lateral.',
      env: [caja([-a + 15, -33, f], [-a + 16.6, -11, f + 32]), cil([-22, zMq], 10, -a + 0.5, -a + 15, 'x'), caja([-a + 16.6, -26, f + 2], [-a + 36, -18, f + 10])],
      partes: [caja([-a + 15, -33, f], [-a + 16.6, -11, f + 32], 'pcbAzul', 'MQ-2'), cil([-22, zMq], 10, -a + 0.5, -a + 15, 'x', 'plata', 'MQ-2: sensor'),
        caja([-a + 16.6, -26, f + 2], [-a + 36, -18, f + 10], 'negro', 'MQ-2: conector Dupont')] },
    { id: 'servo', nom: 'Servo SG90', grupo: 'tapa', medida: '23 × 12 × 23 mm, aletas de 32 mm', nota: 'Encastrado en el piso de la casa: el cuerpo baja por el agujero y las aletas apoyan arriba.',
      env: [caja([xs - 5.9, ys - 6.1, -15.9], [xs + 17.1, ys + 6.1, 6.8]), caja([xs - 10.4, ys - 6.1, 0], [xs + 21.6, ys + 6.1, 2.5]), cil([xs, ys], 5.9, 6.8, 10.8, 'z')],
      partes: [caja([xs - 5.9, ys - 6.1, -15.9], [xs + 17.1, ys + 6.1, 6.8], 'servo', 'Servo SG90'), caja([xs - 10.4, ys - 6.1, 0], [xs + 21.6, ys + 6.1, 2.5], 'servo', 'Aletas del servo'),
        cil([xs, ys], 5.9, 6.8, 10.8, 'z', 'servo', 'Servo SG90'), cil([xs, ys], 2.4, 10.8, 11.2, 'z', 'blanco', 'Eje del servo')] },
    { id: 'reed', nom: 'MC-38: reed', grupo: 'casa', medida: '28 × 14 × 8 mm', nota: 'Sobre la puerta, por dentro, a 2 mm del imán.',
      env: [caja([-11, -50 + t, 39.5], [17, -42 + t, 53.5])], partes: [caja([-11, -50 + t, 39.5], [17, -42 + t, 53.5], 'blanco', 'MC-38: reed')] },
    { id: 'sw420', nom: 'SW-420', grupo: 'casa', medida: '32 × 14 × 8 mm + conector', nota: 'Pared izquierda, junto al frente. Con silicona: la cinta de espuma amortigua los golpes.',
      env: [caja([-50 + t, -48 + t, 5], [-42 + t, -16 + t, 19]), caja([-49 + t, -16 + t, 9], [-44 + t, 4 + t, 15])],
      partes: [caja([-50 + t, -48 + t, 5], [-48.4 + t, -16 + t, 19], 'pcbAzul', 'SW-420'), cil([-28 + t, 12], 2.4, -48.4 + t, -42 + t, 'x', 'negro', 'SW-420: sensor'),
        caja([-48.4 + t, -40 + t, 7], [-43 + t, -34 + t, 13], 'borneraAzul', 'SW-420: potenciómetro'), caja([-49 + t, -16 + t, 9], [-44 + t, 4 + t, 15], 'negro', 'SW-420: conector Dupont')] },
  ];
  // Lo que se mueve: la hoja (con imán, corona y moño) gira en la bisagra; el brazo gira en el eje del servo.
  const iman = { id: 'iman', nom: 'MC-38: imán', grupo: 'puerta', medida: '28 × 14 × 8 mm', nota: 'Arriba de la hoja, por dentro. Sobresale 9 mm de la puerta y hace de tope contra la pared.',
    env: [caja([-9.5, -50 + t, 23.5], [18.5, -42 + t, 37.5])], partes: [caja([-9.5, -50 + t, 23.5], [18.5, -42 + t, 37.5], 'blanco', 'MC-38: imán')] };
  // Brazo en coordenadas propias: eje en el origen, apuntando a +x; el taco mira a la puerta cuando gira 180°.
  const brazo = { zi: 11, zs: 13, largo: 17, taco: { u0: 5, u1: 12, v0: 2.2, v1: 5.7 },
    env: [{ tipo: 'poli', pts: [[0, -3], [17, -2], [17, 2], [0, 3]], h0: 11, h1: 13 }, { tipo: 'poli', pts: circulo(0, 0, 3.6, 20), h0: 10.8, h1: 14.5 },
      { tipo: 'poli', pts: rect(5, 2.2, 12, 5.7), h0: 10.5, h1: 13.5 }] };
  const meca = { bisagra: piv, servo: [xs, ys], brazo, libre: 90, trabado: 180, umbral: 3 };

  // Jardín que no es de cartón
  const deco = [
    ...[[7.5, 7], [5, 17], [4, 24.5]].map(([r, z]) => ({ tipo: 'esfera', c: [-62, 40, z], r, mat: 'tecnopor', nom: 'Muñeco de tecnopor' })),
    { tipo: 'cil', c: [-62, 40], r: 4.2, h0: 27.8, h1: 28.4, eje: 'z', mat: 'negro', nom: 'Sombrero' }, { tipo: 'cil', c: [-62, 40], r: 2.6, h0: 28.4, h1: 32, eje: 'z', mat: 'negro', nom: 'Sombrero' },
    { tipo: 'cono', c: [-62, 36.2, 24.8], r: 0.8, h: 3, mat: 'naranja', nom: 'Nariz de zanahoria' },
    { tipo: 'caja', a: [-44, -66.6, 0], b: [-36, -65.4, n1 * t + 0.3], mat: 'rojo', nom: 'Cinta del regalo' }, { tipo: 'caja', a: [-40.6, -70, 0], b: [-39.4, -62, n1 * t + 0.3], mat: 'rojo', nom: 'Cinta del regalo' },
    { tipo: 'caja', a: [-33, -72.5, 0], b: [-27, -71.5, n2 * t + 0.3], mat: 'oro', nom: 'Cinta del regalo' },
  ];

  return { t, a, f, T, hT, hC, calza, nCalza, z0, zA, zChim, Ws, Ln, sTap, n1, n2, usb: { x: cxE, z: zu }, zMq, piezas, modulos, iman, meca, deco,
    resumen: { bandeja: T, tapa: 158, cavidad: [2 * a, 2 * a, hC], casa: [100, 100, 60], techo: zChim + t } };
}
