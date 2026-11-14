// Medidas únicas del diseño, en mm. z = 0 es la superficie del jardín; +y es la parte trasera.
export const Z = { top: 0, seam: -24, bot: -42, techo: -3, piso: -39.6 };
export const PIV = { x: -7.8, y: -46.6 };                 // eje de la bisagra de la puerta
export const SRV = { x: 4, z: -12, yArm: -32.5 };         // eje del servo y plano del brazo
export const ARM = { largo: 24, ancho: 8, grosor: 4, reposo: -90 };
export const POST = 72.2;                                 // agujeros opcionales tapa-bandeja
export const PIR = { x: 42, y: -63 };
export const BUZ = { x: 64.5, y: 30 };
export const GAS = { x: -64.5, y: -15 };
export const USBX = -36.5;
export const JACKX = 62;

// Volumen que ocupa cada módulo: [min], [max]. Medidas de tienda o típicas.
const P = Z.piso;
export const modulos = {
  shield:  { n: 'Shield con ESP32', a: [-68, 8, P], b: [-5, 74, P + 18], medida: '63 × 66 mm, 18 mm de alto con el ESP32' },
  proto:   { n: 'Protoboard', a: [-2.3, -8, P], b: [52.7, 74, P + 9.3], medida: '55 × 82 × 8,5 mm' },
  cables:  { n: 'Cables Dupont sobre la protoboard', a: [-2.3, -8, P + 9.3], b: [52.7, 74, -13], medida: 'altura de los conectores', virtual: true },
  rele:    { n: 'Relé de 2 canales', a: [24, -52, P], b: [74, -11, P + 20.8], medida: '50 × 41 × 20 mm' },
  lm2596:  { n: 'LM2596', a: [53.7, 8, P], b: [74.7, 51, P + 14.8], medida: '43 × 21 × 14 mm' },
  jack:    { n: 'Jack DC', a: [57, 61, -38], b: [67, 76, -28], medida: 'cuerpo Ø10 × 22 mm', cil: 'y' },
  servo:   { n: 'Servo SG90', a: [-1.9, -65.5, -18.1], b: [21.1, -42.8, -5.9], medida: '23 × 12,2 × 22,7 mm' },
  aletas:  { n: 'Aletas del servo', a: [-6.4, -49.6, -18.1], b: [25.6, -47.1, -5.9], medida: '32 mm' },
  torre:   { n: 'Eje del servo', a: [0, -42.8, -16], b: [8, -35.5, -8], medida: 'eje y brazo de serie' },
  pir:     { n: 'PIR, placa', a: [26, -75, -15.6], b: [58, -51, -5], medida: '32 × 24 mm, pines hacia abajo' },
  buzzer:  { n: 'Buzzer SFM-20B', a: [BUZ.x - 11.5, BUZ.y - 11.5, -15], b: [BUZ.x + 11.5, BUZ.y + 11.5, -3.1], medida: 'Ø23 × 12 mm', cil: 'z' },
  c1:      { n: 'Capacitor C1', a: [40, 52, P + 9.3], b: [50, 62, P + 9.3 + 21], medida: 'Ø10 × 20 mm', cil: 'z' },
};
// Dentro de la casa, sobre la cara interior del muro frontal
export const casa = {
  iman:  { n: 'Imán del MC-38 (en la puerta)', a: [-2, -43, 4], b: [12, -35, 32], medida: '28 × 14 × 8 mm' },
  reed:  { n: 'Reed del MC-38', a: [13.5, -45, 3.5], b: [27.5, -37, 31.5], medida: '28 × 14 × 8 mm' },
  // en la pared lateral izquierda, junto a la esquina: fuera del giro de la puerta y de la ventana
  sw420: { n: 'SW-420', a: [-45, -44, 4], b: [-37, -12, 18], medida: '32 × 14 × 8 mm' },
};
export const IMPRESORA = { n: 'Creality Ender 5 Plus', x: 350, y: 350, z: 400 };
