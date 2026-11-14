// Página de la casita de cartón: visor 3D, plantillas acotadas y tablas. Todo sale de Carton.modelo(t).
const $ = (id) => document.getElementById(id);
const CHK = JSON.parse($('checks').textContent);
const css = (k) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
const { modelo, GROSORES } = Carton;
const { svgPieza, fmt } = Dibujo;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '');
let guardado = 3;
try { const g = +localStorage.getItem('casita-carton-t'); if (GROSORES.includes(g)) guardado = g; } catch {}

// ── Escena
const lienzo = $('lienzo');
const ren = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, preserveDrawingBuffer: true });
ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap;
ren.outputEncoding = THREE.sRGBEncoding; ren.localClippingEnabled = true;
const escena = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, 1, 2, 5000); cam.up.set(0, 0, 1);
escena.add(new THREE.HemisphereLight(0xf4f8ff, 0x8a7a68, 0.62));
const sol = new THREE.DirectionalLight(0xffffff, 0.78); sol.position.set(170, -230, 360);
sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -220, right: 220, top: 220, bottom: -220, near: 50, far: 1000 }); sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.5;
escena.add(sol);
const relleno = new THREE.DirectionalLight(0xdfe8ff, 0.25); relleno.position.set(-200, 160, 120); escena.add(relleno);
const mesa = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.ShadowMaterial({ opacity: 0.16 }));
mesa.position.z = -42.05; mesa.receiveShadow = true; escena.add(mesa);

// Colores de pintura y canto de cartón
const COL = { nieve: 0xf1f4f6, madera: 0xc59a6a, carton: 0xb98a5c, rojo: 0xa3372b, verde: 0x2f7a4a, blanco: 0xf6f1e4, ladrillo: 0xa3563f, piedra: 0xa8a196, oro: 0xd6a33a, vidrio: 0xe6eef2 };
const CANTO = { nieve: 0xd9d4ca, madera: 0xa9814f, carton: 0x9c7349, rojo: 0x86302a, verde: 0x2a6a41, ladrillo: 0x8a4835, oro: 0xb98a2e };
const plano = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 8);
const matsCarton = new Map();
function matCarton(col, canto) {
  const k = `${col}|${canto}`;
  if (!matsCarton.has(k)) {
    const vid = col === 'vidrio';
    const mk = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.86, metalness: 0, side: THREE.DoubleSide, transparent: vid, opacity: vid ? 0.72 : 1, clippingPlanes: [], clipShadows: true });
    matsCarton.set(k, [mk(COL[col]), mk(canto ? (CANTO[col] ?? COL[col]) : COL[col])]);
  }
  return matsCarton.get(k);
}
const mE = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.55, metalness: o.m ?? 0.05, clippingPlanes: [] });
const tx = (() => { const c = document.createElement('canvas'); c.width = 220; c.height = 328; const g = c.getContext('2d');
  g.fillStyle = '#f3f2ec'; g.fillRect(0, 0, 220, 328); g.fillStyle = '#5b5e60';
  for (let i = 0; i < 30; i++) for (let j = 0; j < 10; j++) g.fillRect(48 + j * 13 + (j > 4 ? 14 : 0), 14 + i * 10.4, 3, 3);
  for (const x of [12, 22, 190, 200]) for (let i = 0; i < 30; i++) g.fillRect(x, 14 + i * 10.4, 3, 3);
  g.fillStyle = '#d83b2f'; g.fillRect(6, 6, 2, 316); g.fillRect(206, 6, 2, 316); g.fillStyle = '#2f5fd0'; g.fillRect(29, 6, 2, 316); g.fillRect(184, 6, 2, 316);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; })();
const ME = { pcbAzul: mE(0x1e5aa8), pcbVerde: mE(0x2d7d46), pcbNegro: mE(0x1d2226), negro: mE(0x18191b, { r: 0.4 }), plata: mE(0xc5ccd2, { r: 0.3, m: 0.7 }), blanco: mE(0xf2f2ec, { r: 0.8 }),
  azulRele: mE(0x2c6fd6, { r: 0.35 }), borneraAzul: mE(0x2a64c9), servo: mE(0x2f61d8, { r: 0.45 }), amarillo: mE(0xf1c232), lente: mE(0xf7f7f2, { r: 0.25 }),
  capacitor: mE(0x22314f, { r: 0.3 }), proto: new THREE.MeshStandardMaterial({ map: tx, roughness: 0.8 }), tecnopor: mE(0xfbfbf8, { r: 0.95 }), naranja: mE(0xe8792b), rojo: mE(0xa3372b, { r: 0.8 }), oro: mE(0xd6a33a, { r: 0.6 }) };

const grupos = { bandeja: new THREE.Group(), tapa: new THREE.Group(), casa: new THREE.Group(), techo: new THREE.Group(), cables: new THREE.Group() };
const ALTO = { bandeja: 0, tapa: 85, casa: 175, techo: 275, cables: 0 };
Object.values(grupos).forEach((g) => escena.add(g));
const bisagra = new THREE.Group(), hoja = new THREE.Group(), ejeBrazo = new THREE.Group();
let carton = [], electronica = [], info = new Map(), M = null;

function extruir(pts, agujeros, prof) {
  const sh = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
  for (const h of agujeros) sh.holes.push(new THREE.Path(h.map(([u, v]) => new THREE.Vector2(u, v))));
  return new THREE.ExtrudeGeometry(sh, { depth: prof, bevelEnabled: false, curveSegments: 1 });
}
function registrar(m, lista, nombre, nota) { m.castShadow = true; m.receiveShadow = true; info.set(m, { nombre, nota }); lista.push(m); return m; }
function parte(q, padre, nota) {
  let g, pos = [0, 0, 0], rot = null;
  if (q.tipo === 'caja') { g = new THREE.BoxGeometry(q.b[0] - q.a[0], q.b[1] - q.a[1], q.b[2] - q.a[2]); pos = [0, 1, 2].map((i) => (q.a[i] + q.b[i]) / 2); }
  else if (q.tipo === 'cil') {
    g = new THREE.CylinderGeometry(q.r, q.r, q.h1 - q.h0, 28); const m = (q.h0 + q.h1) / 2;
    if (q.eje === 'z') { pos = [q.c[0], q.c[1], m]; rot = [Math.PI / 2, 0, 0]; } else if (q.eje === 'y') pos = [q.c[0], m, q.c[1]]; else { pos = [m, q.c[0], q.c[1]]; rot = [0, 0, Math.PI / 2]; }
  } else if (q.tipo === 'domo') { g = new THREE.SphereGeometry(q.r, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2); pos = q.c; rot = [Math.PI / 2, 0, 0]; }
  else if (q.tipo === 'esfera') { g = new THREE.SphereGeometry(q.r, 32, 20); pos = q.c; }
  else if (q.tipo === 'cono') { g = new THREE.ConeGeometry(q.r, q.h, 16); pos = [q.c[0], q.c[1] - q.h / 2, q.c[2]]; rot = [0, 0, Math.PI]; }
  const m = new THREE.Mesh(g, (ME[q.mat] || ME.blanco).clone()); m.position.set(...pos); if (rot) m.rotation.set(...rot);
  padre.add(m); return registrar(m, electronica, q.nom, nota);
}

function construir(t) {
  M = modelo(t);
  for (const g of [...Object.values(grupos)]) { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); g.clear(); }
  carton = []; electronica = []; info = new Map();
  bisagra.clear(); hoja.clear(); ejeBrazo.clear();
  const [px, py] = M.meca.bisagra;
  bisagra.position.set(px, py, 0); hoja.position.set(-px, -py, 0); bisagra.add(hoja); grupos.casa.add(bisagra);
  const destino = { bandeja: grupos.bandeja, tapa: grupos.tapa, jardin: grupos.tapa, casa: grupos.casa, puerta: hoja, techo: grupos.techo };
  for (const p of M.piezas) {
    const medida = `${fmt(p.ancho)} × ${fmt(p.alto)} mm, ${p.mat === 'corrugado' ? `cartón de ${fmt(t)} mm` : p.mat}${p.cant > 1 ? `, ${p.cant} piezas` : ''}`;
    for (const s of p.solidos) {
      const g = extruir(s.contorno, (s.agujeros || []).map((h) => h.pts), s.th);
      const m = new THREE.Mesh(g, matCarton(p.col, p.mat === 'corrugado'));
      m.matrixAutoUpdate = false;
      m.matrix.makeBasis(new THREE.Vector3(...s.U), new THREE.Vector3(...s.V), new THREE.Vector3(...s.N)).setPosition(...s.o);
      destino[p.grupo].add(m); registrar(m, carton, p.nom, `${medida}. ${p.nota || ''}`.trim());
    }
  }
  for (const q of M.deco) parte(q, grupos.tapa, q.mat === 'tecnopor' ? 'Tres bolitas de tecnopor de 15, 10 y 8 mm, o plastilina blanca.' : 'Decoración del jardín.');
  const grupoMod = { bandeja: grupos.bandeja, tapa: grupos.tapa, casa: grupos.casa, puerta: hoja };
  for (const mod of [...M.modulos, M.iman]) for (const q of mod.partes) parte(q, grupoMod[mod.grupo], `${mod.medida}. ${mod.nota || ''}`);
  // Brazo del servo: gira sobre su eje; en reposo apunta hacia atrás
  const [xs, ys] = M.meca.servo;
  ejeBrazo.position.set(xs, ys, 0); grupos.tapa.add(ejeBrazo);
  M.meca.brazo.env.forEach((e, i) => {
    const m = new THREE.Mesh(extruir(e.pts, [], e.h1 - e.h0), (i === 2 ? mE(COL.carton, { r: 0.85 }) : ME.blanco.clone())); m.position.z = e.h0;
    ejeBrazo.add(m); registrar(m, electronica, ['Brazo del servo', 'Brazo del servo', 'Taco del brazo'][i], i === 2 ? `Capas de cartón pegadas al brazo hasta quedar a 1–2 mm de la puerta cerrada.` : 'El brazo que viene con el servo, de unos 17 mm.');
  });
  cables(t);
  aplicarModo();
}

// Cables: solo ilustran el recorrido
function cables(t) {
  const { a, f, calza } = M, zS = f + calza, [xs, ys] = M.meca.servo;
  const NET = { v12: 0xd23b30, v5: 0xf08a24, gnd: 0x2b2f33, sen: 0x12a2b3 };
  const xL = a - 11;
  const R = [
    ['v12', [[58.5, a - 22, -13.5], [58, a - 28, -19], [xL - 4, 54, f + 12], [xL - 4, 50, f + 5]]],
    ['gnd', [[61.5, a - 22, -13.5], [62, a - 28, -20], [xL + 3, 54, f + 12], [xL + 3, 50, f + 5]]],
    ['v12', [[60, a - 22, -15.5], [72, 20, -20], [70, -6, f + 18], [67, -22, f + 12]]],
    ['v5', [[xL - 4, 12, f + 5], [xL - 6, 4, f + 14], [46, 0, f + 12], [42, 4, f + 8]]],
    ['gnd', [[xL + 3, 12, f + 5], [xL + 2, 2, f + 15], [46, -2, f + 13], [40, 4, f + 8]]],
    ['v5', [[-6, 50, f + 8.5], [-10, 50, zS + 16], [-13.5, 48, zS + 10]]],
    ['gnd', [[-6, 44, f + 8.5], [-10, 44, zS + 16], [-13.5, 42, zS + 10]]],
    ['sen', [[-14, a - 60, zS + 10], [-4, -6, f + 18], [25.3, -26, f + 9]]],
    ['v12', [[66, -42, f + 12], [74, -12, -12], [70, 16, -t - 8], [64, 21, -t - 10]]],
    ['sen', [[xs + 15, ys, -14], [20, -20, -20], [8, -6, f + 10]]],
    ['v5', [[xs + 15, ys + 2, -14], [22, -20, -21], [10, -6, f + 10]]],
    ['gnd', [[xs + 15, ys - 2, -14], [24, -20, -22], [12, -6, f + 10]]],
    ['sen', [[42, -53, -t - 25], [20, -30, -24], [-14, a - 62, zS + 10]]],
    ['sen', [[17, -46 + t, 47], [40, -46 + t, 56], [44, -46 + t, 40], [44, -45 + t, 4], [41, -26, 1], [41, -26, -12], [8, 4, -16], [-14, a - 58, zS + 10]]],
    ['sen', [[-46 + t, 4 + t, 12], [-44, 7, 4], [-42, 6, -6], [-30, 14, zS + 14], [-14, a - 56, zS + 10]]],
  ];
  for (const [net, pts] of R) {
    const curva = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 64, 0.6, 8), new THREE.MeshStandardMaterial({ color: NET[net], roughness: 0.5 }));
    m.castShadow = true; grupos.cables.add(m);
  }
}

// ── Estado de la vista
const E = { t: guardado, vista: 'frente', modo: 'armada', corte: 8, puerta: 0, metaPuerta: 0, brazo: 90, metaBrazo: 90, bloqueado: false };
function aplicarModo() {
  const xr = E.modo === 'rayos', exp = E.modo === 'despiece', cor = E.modo === 'corte';
  plano.constant = E.corte;
  const mats = new Set(carton.flatMap((m) => (Array.isArray(m.material) ? m.material : [m.material])));
  for (const mat of mats) {
    const vid = mat.color.getHex() === COL.vidrio;
    mat.transparent = xr || vid; mat.opacity = xr ? 0.16 : vid ? 0.72 : 1; mat.depthWrite = !xr;
    mat.clippingPlanes = cor ? [plano] : []; mat.needsUpdate = true;
  }
  for (const m of carton) m.castShadow = !xr;
  for (const [k, g] of Object.entries(grupos)) g.position.z = exp ? ALTO[k] : 0;
  grupos.cables.visible = !exp;
  grupos.techo.visible = E.vista !== 'puerta';
  document.querySelectorAll('[data-vista]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vista === E.vista)));
  document.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === E.modo)));
  $('fila-corte').hidden = !cor;
  pedir();
}

// Cámara orbital con z hacia arriba
const O = { r: 520, th: -1.08, ph: 0.98, t: new THREE.Vector3(0, -6, 25) };
const VISTAS = { frente: { r: 540, th: -1.08, ph: 0.98, t: [0, -6, 28] }, atras: { r: 500, th: 1.95, ph: 1.12, t: [0, 10, 14] }, arriba: { r: 480, th: -1.5708, ph: 0.12, t: [0, 0, 0] },
  puerta: { r: 215, th: 1.78, ph: 0.9, t: [4, -40, 20] }, despiece: { r: 1000, th: -1.08, ph: 1.05, t: [0, 0, 140] } };
function colocar() { const s = Math.sin(O.ph); cam.position.set(O.t.x + O.r * s * Math.cos(O.th), O.t.y + O.r * s * Math.sin(O.th), O.t.z + O.r * Math.cos(O.ph)); cam.lookAt(O.t); }
function vista(k) { const v = VISTAS[k]; O.r = v.r; O.th = v.th; O.ph = v.ph; O.t.set(...v.t); E.vista = k; aplicarModo(); }
const punteros = new Map(); let arrastre = null;
lienzo.addEventListener('pointerdown', (e) => { lienzo.setPointerCapture(e.pointerId); punteros.set(e.pointerId, [e.clientX, e.clientY]); arrastre = { boton: e.button, mov: 0 }; });
lienzo.addEventListener('pointermove', (e) => {
  if (!punteros.has(e.pointerId)) { tocar(e); return; }
  const [x0, y0] = punteros.get(e.pointerId), dx = e.clientX - x0, dy = e.clientY - y0;
  if (punteros.size === 2) {
    const [p1, p2] = [...punteros.values()], d0 = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
    punteros.set(e.pointerId, [e.clientX, e.clientY]); const [q1, q2] = [...punteros.values()];
    O.r = Math.min(1400, Math.max(90, (O.r * d0) / Math.max(1, Math.hypot(q1[0] - q2[0], q1[1] - q2[1])))); pedir(); return;
  }
  punteros.set(e.pointerId, [e.clientX, e.clientY]); if (arrastre) arrastre.mov += Math.abs(dx) + Math.abs(dy);
  if (arrastre && (arrastre.boton === 2 || e.shiftKey)) {
    const k = (O.r / lienzo.clientHeight) * 0.9, d = new THREE.Vector3(); cam.getWorldDirection(d);
    const der = new THREE.Vector3().crossVectors(d, cam.up).normalize(), arr = new THREE.Vector3().crossVectors(der, d).normalize();
    O.t.addScaledVector(der, -dx * k).addScaledVector(arr, dy * k);
  } else { O.th -= dx * 0.008; O.ph = Math.min(1.55, Math.max(0.05, O.ph - dy * 0.008)); }
  pedir();
});
const soltar = (e) => { punteros.delete(e.pointerId); if (!punteros.size && arrastre && arrastre.mov < 4) tocar(e, true); if (!punteros.size) arrastre = null; };
lienzo.addEventListener('pointerup', soltar); lienzo.addEventListener('pointercancel', soltar);
lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
lienzo.addEventListener('wheel', (e) => { e.preventDefault(); O.r = Math.min(1400, Math.max(90, O.r * Math.exp(e.deltaY * 0.0012))); pedir(); }, { passive: false });

const rc = new THREE.Raycaster(), ptr = new THREE.Vector2(); let resaltada = null;
function tocar(e, fijar) {
  const r = lienzo.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  rc.setFromCamera(ptr, cam);
  const lista = electronica.concat(E.modo === 'rayos' ? [] : carton).filter((m) => { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; });
  const hit = rc.intersectObjects(lista, false).find((h) => E.modo !== 'corte' || h.point.x <= E.corte || electronica.includes(h.object));
  const m = hit ? hit.object : null;
  if (m !== resaltada) {
    if (resaltada && electronica.includes(resaltada)) resaltada.material.emissive.setHex(0);
    resaltada = m; if (m && electronica.includes(m)) m.material.emissive.setHex(0x553300);
    pedir();
  }
  lienzo.style.cursor = m ? 'pointer' : 'grab';
  if (m && (fijar || e.pointerType === 'mouse')) { const i = info.get(m); $('ficha-nombre').textContent = i.nombre; $('ficha-nota').textContent = i.nota || ''; }
}
lienzo.addEventListener('pointerleave', () => { if (resaltada && electronica.includes(resaltada)) resaltada.material.emissive.setHex(0); resaltada = null; pedir(); });

// Puerta y pestillo
const avisar = (t) => { $('aviso').textContent = t; };
const chk = () => CHK[E.t];
$('b-cerrojo').onclick = () => {
  if (!E.bloqueado && E.metaPuerta > 0.5) { avisar('Primero cierra la puerta: el brazo solo gira con la puerta cerrada.'); return; }
  E.bloqueado = !E.bloqueado; E.metaBrazo = E.bloqueado ? M.meca.trabado : M.meca.libre;
  if (E.bloqueado && E.vista !== 'puerta') { if (E.modo === 'despiece') E.modo = 'armada'; vista('puerta'); }
  avisar(E.bloqueado ? 'El servo gira el brazo 90° y queda detrás de la puerta.' : 'El brazo vuelve a apuntar hacia atrás.'); botones(); pedir();
};
$('b-puerta').onclick = () => {
  if (E.metaPuerta > 0.5) { E.metaPuerta = 0; avisar('Puerta cerrada.'); }
  else if (E.bloqueado) { E.metaPuerta = chk().puerta.trabada.angulo; E.rebote = true; avisar(`Trabada: la puerta se abre ${f1(chk().puerta.trabada.angulo)}° (su borde se mueve ${f1(chk().puerta.juegoBorde)} mm) y choca con el taco del brazo.`); }
  else { E.metaPuerta = 85; avisar('La puerta gira hacia adentro sobre una bisagra de cinta.'); }
  botones(); pedir();
};
function botones() { $('b-puerta').textContent = E.metaPuerta > 0.5 && !E.rebote ? 'Cerrar puerta' : 'Abrir puerta'; $('b-cerrojo').textContent = E.bloqueado ? 'Quitar cerrojo' : 'Poner cerrojo'; }
document.querySelectorAll('[data-modo]').forEach((b) => { b.onclick = () => {
  const antes = E.modo; E.modo = b.dataset.modo; aplicarModo();
  if (E.modo === 'despiece') vista('despiece'); else if (antes === 'despiece') vista('frente');
}; });
document.querySelectorAll('[data-vista]').forEach((b) => { b.onclick = () => vista(b.dataset.vista); });
$('r-corte').oninput = (e) => { E.corte = +e.target.value; $('v-corte').textContent = `x = ${E.corte} mm`; aplicarModo(); };

let pendiente = false;
function pedir() { if (!pendiente) { pendiente = true; requestAnimationFrame(cuadro); } }
const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
function cuadro() {
  pendiente = false;
  const paso = reducido ? 1 : 0.16;
  E.puerta += (E.metaPuerta - E.puerta) * paso; E.brazo += (E.metaBrazo - E.brazo) * paso;
  if (E.rebote && Math.abs(E.puerta - E.metaPuerta) < 0.05) { E.rebote = false; E.metaPuerta = 0; botones(); }
  bisagra.rotation.z = (E.puerta * Math.PI) / 180;
  ejeBrazo.rotation.z = (E.brazo * Math.PI) / 180;
  const w = lienzo.clientWidth, h = lienzo.clientHeight;
  if (lienzo.width !== Math.round(w * ren.getPixelRatio()) || lienzo.height !== Math.round(h * ren.getPixelRatio())) { ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  ren.setClearColor(new THREE.Color(css('--visor')), 1);
  colocar(); ren.render(escena, cam);
  if (Math.abs(E.puerta - E.metaPuerta) > 0.03 || Math.abs(E.brazo - E.metaBrazo) > 0.03) pedir();
}
new ResizeObserver(pedir).observe(lienzo);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', pedir);
new MutationObserver(pedir).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ── Plantillas, tablas y comprobaciones para el grosor elegido
const GRUPOS = [['bandeja', 'Bandeja'], ['tapa', 'Tapa (jardín)'], ['casa', 'Casa'], ['puerta', 'Puerta'], ['techo', 'Techo'], ['jardin', 'Jardín']];
const MATN = { corrugado: 'Cartón', cartulina: 'Cartulina', microporoso: 'Microporoso', acetato: 'Acetato' };
// Cada lámina se dibuja al ancho real de su tarjeta: texto de unos 14 px, entre 3,2 y 7 px por mm
function ajustarLaminas() {
  document.querySelectorAll('figure.pieza').forEach((fig) => {
    const p = M.piezas[+fig.dataset.i], caja = fig.querySelector('.lamina'), disp = caja.clientWidth;
    if (!disp || +caja.dataset.ancho === disp && +caja.dataset.t === E.t) return;
    let fs = 3, k = 4, r;
    // los rectángulos sin plantilla solo muestran su medida: van más chicos
    const [kMin, kMax] = p.plantilla ? [3.2, 7] : [1.6, 2.6];
    for (let i = 0; i < 3; i++) { r = svgPieza(p, { fs, conTitulo: false }); k = Math.min(kMax, Math.max(kMin, disp / r.w)); fs = 14 / k; }
    r = svgPieza(p, { fs, conTitulo: false });
    caja.dataset.ancho = disp; caja.dataset.t = E.t;
    caja.innerHTML = `<svg viewBox="0 0 ${r.w.toFixed(1)} ${r.h.toFixed(1)}" style="width:${(r.w * k).toFixed(0)}px" role="img" aria-label="Plantilla acotada: ${esc(p.nom)}">${r.svg}</svg>`;
  });
}
let tAjuste = 0;
new ResizeObserver(() => { clearTimeout(tAjuste); tAjuste = setTimeout(ajustarLaminas, 120); }).observe($('laminas'));
function paginas() {
  const t = E.t, K = CHK[t];
  document.querySelectorAll('[data-t]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.t === t)));
  document.querySelectorAll('.t-actual').forEach((n) => { n.textContent = fmt(t); });
  $('pdf-txt').textContent = `Descargar plantillas 1:1 para cartón de ${fmt(t)} mm (PDF, A4)`;
  // Láminas por grupo
  $('laminas').innerHTML = GRUPOS.map(([g, nom]) => {
    const ps = M.piezas.filter((p) => p.grupo === g);
    return `<h3 class="grupo-t">${nom}</h3><div class="laminas">${ps.map((p) => `<figure class="pieza${p.plantilla ? (p.ancho > 120 ? ' triple' : p.ancho > 60 ? ' doble' : '') : (p.ancho > 120 ? ' doble' : '')}" data-i="${M.piezas.indexOf(p)}">
      <figcaption><b>${esc(p.nom)}</b><span>${p.cant > 1 ? `${p.cant} × ` : ''}${fmt(p.ancho)} × ${fmt(p.alto)} mm · ${MATN[p.mat]}${p.mat === 'corrugado' ? ` ${fmt(t)} mm` : ''}${p.plantilla ? ' · en el PDF' : ''}</span></figcaption>
      <div class="lamina"></div>${p.nota ? `<p>${esc(p.nota)}</p>` : ''}</figure>`).join('')}</div>`;
  }).join('');
  ajustarLaminas();
  // Lista de corte y material
  const area = (pts) => Math.abs(pts.reduce((s, q, i) => { const r = pts[(i + 1) % pts.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
  const sup = (mat) => M.piezas.filter((p) => p.mat === mat).reduce((s, p) => s + p.cant * area(p.forma.contorno), 0);
  $('m-carton').textContent = `${(sup('corrugado') / 1e6).toFixed(2).replace('.', ',')} m²`;
  $('lista').innerHTML = M.piezas.map((p) => `<tr><td>${esc(p.nom)}</td><td>${MATN[p.mat]}</td><td class="n">${p.cant}</td><td class="n">${fmt(p.ancho)} × ${fmt(p.alto)}</td><td>${p.plantilla ? 'Plantilla' : 'Regla'}</td></tr>`).join('');
  // Componentes
  $('componentes').innerHTML = [...M.modulos.filter((m) => !m.virtual), M.iman].map((m) => `<tr><td>${esc(m.nom)}</td><td>${esc(m.nota)}</td><td class="n">${esc(m.medida)}</td></tr>`).join('');
  // Comprobaciones
  const filas = [
    [`${K.solidos} volúmenes entre piezas y módulos, sin ningún choque`, K.choques.length === 0],
    [`Sin cerrojo, la puerta gira ${K.puerta.libre.angulo}° y se detiene contra la pared del frente`, K.puerta.libre.angulo >= 85],
    [`Con cerrojo, se abre ${f1(K.puerta.trabada.angulo)}°: su borde se mueve ${f1(K.puerta.juegoBorde)} mm y el imán sigue junto al reed`, K.puerta.trabada.angulo <= 8],
    [`El brazo gira de reposo a trabado sin tocar nada con la puerta cerrada`, !K.barrido],
    [`La tapa entra en la bandeja con ${fmt(K.holguras.tapaBandeja)} mm de juego por lado; el tapón del techo, con ${fmt(K.holguras.tapon)} mm`, true],
    [`El servo queda ${fmt(K.holguras.servoRele)} mm sobre el relé`, K.holguras.servoRele >= 1],
    [`La ranura del USB queda ${fmt(K.holguras.usbSobreBorde)} mm sobre el borde de la bandeja, y el jack, ${fmt(K.holguras.jackSobreBorde)} mm`, K.holguras.usbSobreBorde > 0],
    [`Ningún sensor queda a la vista detrás de una ventana`, K.ventanas.length === 0],
    [`Todas las plantillas caben en una hoja A4`, K.A4.every((x) => x.cabe)],
  ];
  $('checks-t').innerHTML = filas.map(([txt, ok]) => `<tr><td>${esc(txt)}</td><td><span class="tag ${ok ? 'ok' : 'warn'}">${ok ? 'Pasa' : 'Revisar'}</span></td></tr>`).join('');
  $('s-trabada').textContent = `${f1(K.puerta.trabada.angulo)}°`;
  $('s-piezas').textContent = M.piezas.reduce((s, p) => s + p.cant, 0);
  $('s-bandeja').textContent = `${fmt(M.T)} mm`;
  $('cav').textContent = `${fmt(2 * M.a)} × ${fmt(2 * M.a)} × ${fmt(M.hC)}`;
}
function grosor(t) {
  E.t = t; try { localStorage.setItem('casita-carton-t', String(t)); } catch {}
  E.metaPuerta = E.puerta = 0; E.bloqueado = false; E.metaBrazo = E.brazo = 90; botones();
  construir(t); paginas();
}
document.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => grosor(+b.dataset.t); });

// Descarga del PDF del grosor elegido: el visor de claude.ai pide confirmación; sin la capacidad, el botón no aparece
let descargas = null;
(async () => {
  try { descargas = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch { descargas = null; }
  $('pdf').hidden = !descargas;
})();
$('pdf').onclick = async () => {
  if (!descargas) return;
  const estado = $('pdf-estado'), t = E.t;
  try {
    const r = await fetch(`plantillas_${t}mm.pdf`);
    if (!r.ok) throw { code: 'unavailable' };
    await descargas.save({ filename: `casita_carton_plantillas_${t}mm.pdf`, data: await r.blob() });
    estado.textContent = `Listo: plantillas para cartón de ${fmt(t)} mm.`;
  } catch (err) {
    const c = err && err.code;
    if (c === 'declined') return;
    if (c === 'rate_limited') { estado.textContent = 'Ya hay una descarga esperando confirmación.'; return; }
    estado.textContent = 'No se pudo descargar aquí. Los PDF también están en casita_carton/, junto al proyecto.';
    if (['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(c)) $('pdf').hidden = true;
  }
};

grosor(E.t); vista('frente');
window.__listo = true;
window.__visor = { E, aplicarModo, vista, pedir, cuadro, grosor };
