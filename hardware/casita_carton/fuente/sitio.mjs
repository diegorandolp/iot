// Arma la página de la casita de cartón en un solo HTML. Uso: node sitio.mjs <salida.html>
import { readFileSync, writeFileSync } from 'node:fs';

const leer = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
// Cada módulo va en su propia función para que sus nombres no choquen
const modulo = (src, nom, exporta) => `const ${nom} = (() => {\n${src.replace(/^import .*$/gm, '').replace(/^export /gm, '')}\nreturn { ${exporta.join(', ')} };\n})();`;
const checks = leer('out/checks.json');
const salida = process.argv[2] || new URL('out/casita.html', import.meta.url).pathname;

const html = `<title>Casita IoT de cartón</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,650&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap">
<style>${leer('estilos.css')}</style>
<div class="page">
  <header class="top">
    <div class="top-text">
      <p class="eyebrow">CS5055 · Sistema de seguridad residencial IoT · versión de cartón</p>
      <h1>Casita IoT de cartón</h1>
      <p class="lede">El modelo <span class="mono">casita_iot</span> hecho a mano con cartón corrugado y cartulina, con las mismas medidas por fuera. La base guarda toda la electrónica, la puerta se traba con el servo y cada pieza tiene su plantilla con medidas.</p>
    </div>
    <div class="stats">
      <div class="stat"><b id="s-piezas">0</b><span>piezas que cortar, con plantillas 1:1 en A4</span></div>
      <div class="stat"><b id="s-bandeja">0</b><span>de lado en la base; la casa mide 100 × 100 × 60 mm</span></div>
      <div class="stat"><b>0</b><span>choques entre piezas, sensores y módulos</span></div>
      <div class="stat"><b id="s-trabada">0</b><span>se abre la puerta con el cerrojo puesto</span></div>
    </div>
  </header>

  <div class="grosor">
    <span class="eyebrow">Grosor de su cartón</span>
    <div class="seg" role="group" aria-label="Grosor del cartón"><button type="button" data-t="2">2 mm</button><button type="button" data-t="3">3 mm</button><button type="button" data-t="4">4 mm</button></div>
    <p>Mídanlo en el borde de la caja que van a usar. La vista 3D, las medidas y el PDF cambian con el grosor.</p>
  </div>

  <section aria-label="Visor 3D">
    <div class="banco">
      <div class="mesa">
        <div class="barra">
          <div class="grupo"><span>Vista</span><div class="fila"><button data-modo="armada" type="button">Armada</button><button data-modo="rayos" type="button">Rayos X</button><button data-modo="despiece" type="button">Despiece</button><button data-modo="corte" type="button">Corte</button></div></div>
          <div class="grupo"><span>Cámara</span><div class="fila"><button data-vista="frente" type="button">Frente</button><button data-vista="atras" type="button">Atrás</button><button data-vista="arriba" type="button">Arriba</button><button data-vista="puerta" type="button">Puerta</button></div></div>
          <div class="grupo"><span>Mecanismo</span><div class="fila"><button id="b-puerta" class="accion" type="button">Abrir puerta</button><button id="b-cerrojo" type="button">Poner cerrojo</button></div></div>
        </div>
        <canvas id="lienzo" aria-label="Vista 3D de la casita de cartón con la electrónica en la base. Arrastra para girar."></canvas>
        <div class="corte" id="fila-corte" hidden><label for="r-corte">Plano de corte</label><input id="r-corte" type="range" min="-90" max="90" step="1" value="8"><span id="v-corte" class="mono">x = 8 mm</span></div>
      </div>
      <aside class="panel">
        <div class="ficha"><span class="eyebrow">Señalado</span><h3 id="ficha-nombre">Pasa el cursor por una pieza</h3><p id="ficha-nota">Cada pieza muestra su medida de corte. Usa Rayos X para ver la electrónica.</p></div>
        <p class="aviso" id="aviso" aria-live="polite"></p>
        <div class="leyenda">
          <div><i style="background:#c59a6a"></i>Cartón sin pintar: paredes de la casa</div>
          <div><i style="background:#1e5aa8"></i>Placas de los módulos</div>
          <div><i style="background:#2f61d8"></i>Servo SG90</div>
          <div><i style="background:#f08a24"></i>Cable de 5 V</div>
          <div><i style="background:#d23b30"></i>Cable de 12 V</div>
          <div><i style="background:#12a2b3"></i>Cable de señal</div>
          <div><i style="background:#2b2f33"></i>Cable GND</div>
        </div>
        <p class="ayuda">Arrastra para girar, usa la rueda o pellizca para acercar, y clic derecho o Shift para desplazar. Los cables solo muestran el recorrido; las conexiones exactas están en el diagrama de conexiones.</p>
      </aside>
    </div>
  </section>

  <section>
    <div class="sec-head"><h2>Qué cambia al pasar a cartón</h2><p>Por fuera se ve como el modelo 3D. Por dentro, cada mecanismo se resolvió con lo que se corta y se pega a mano.</p></div>
    <div class="cambios">
      <div class="cambio"><span class="antes">En 3D: bandeja y tapa impresas</span><h3>Una base de dos cajas</h3><p>La bandeja tiene paredes dobles y la tapa es el jardín. Las paredes de la tapa bajan por dentro de la bandeja hasta su piso, con 1 mm de juego por lado, así que se levanta con la casa encima. Dentro quedan <span id="cav" class="mono">152 × 152 × 36</span> mm.</p></div>
      <div class="cambio"><span class="antes">En 3D: pasador de filamento</span><h3>Bisagra de cinta</h3><p>La hoja de la puerta sale de su propio hueco y gira hacia adentro sobre una tira de cinta masking. El imán del MC-38 va arriba de la hoja y sobresale 9 mm: al cerrar, apoya en la pared y hace de tope.</p></div>
      <div class="cambio"><span class="antes">En 3D: pestillo impreso</span><h3>Pestillo con el brazo del servo</h3><p>El servo se encastra en el piso de la casa: el cuerpo baja por un agujero y las aletas apoyan arriba. Su brazo de serie, con un taco de cartón, gira detrás de la puerta. Trabada, la puerta se abre unos 4° y no más.</p></div>
      <div class="cambio"><span class="antes">En 3D: reed junto a la puerta</span><h3>Sensores escondidos</h3><p>Entre la puerta y la ventana quedan 9 mm de pared, y el reed mide 14. Por eso el reed va sobre la puerta. El SW-420 va en la pared izquierda, pegado con silicona. Los vidrios de papel vegetal ocultan el interior.</p></div>
      <div class="cambio"><span class="antes">En 3D: techo con asiento impreso</span><h3>Techo desmontable</h3><p>Una base, un tapón, dos tímpanos y dos faldones. El tapón entra en la casa con 0,5 mm de juego: el techo no se corre y se saca para llegar al servo y a los sensores.</p></div>
      <div class="cambio"><span class="antes">En 3D: piezas de colores</span><h3>Decoración de cartulina</h3><p>Árboles en cruz de cartón, marcos, corona, caminito y copos de cartulina. La nieve del techo es de microporoso y se dobla en la cumbrera. El muñeco es de tecnopor y el PIR asoma del jardín como una bola de nieve.</p></div>
    </div>
  </section>

  <section>
    <div class="sec-head"><h2>Materiales y herramientas</h2></div>
    <div class="materiales">
      <div class="cambio"><h3>Cartón y papel</h3><ul>
        <li><b>Cartón corrugado de <span class="t-actual">3</span> mm:</b> <span id="m-carton">0</span>, unas dos cajas medianas</li>
        <li><b>Cartulina</b> blanca, roja, verde, gris y dorada, o blanca y pintada</li>
        <li><b>Microporoso blanco de 2 mm:</b> 13 × 17 cm para la nieve del techo</li>
        <li><b>Papel vegetal o acetato:</b> 5 cuadrados de 20 mm</li>
        <li><b>Tecnopor:</b> 3 bolitas de 15, 10 y 8 mm, o plastilina blanca</li></ul></div>
      <div class="cambio"><h3>Para pegar y pintar</h3><ul>
        <li><b>Silicona caliente:</b> pistola y unas 5 barras</li>
        <li><b>Goma en barra</b> para las cartulinas y las plantillas</li>
        <li><b>Cinta masking de 12 mm:</b> la bisagra de la puerta</li>
        <li><b>Cinta doble contacto:</b> módulos de la bandeja e imán</li>
        <li><b>Témpera o acrílico</b> blanco, rojo y verde</li></ul></div>
      <div class="cambio"><h3>Herramientas</h3><ul>
        <li><b>Cúter</b> con cuchilla nueva</li>
        <li><b>Regla metálica</b> y escuadra</li>
        <li><b>Base de corte</b> o un cartón grueso debajo</li>
        <li><b>Punzón o perforadora</b> para los agujeros de 3,5 mm</li>
        <li><b>Lápiz, tijera y compás</b> para los círculos</li></ul></div>
    </div>
  </section>

  <section>
    <div class="sec-head"><h2>Plantillas y medidas</h2><p>Todas las medidas están en mm. Las piezas que dicen «en el PDF» salen a tamaño real: impriman al 100 %, comprueben el cuadrado de 50 mm y peguen la hoja sobre el cartón. Las demás son rectángulos para marcar con regla.</p></div>
    <div class="grosor">
      <span class="eyebrow">Cartón de <span class="t-actual">3</span> mm</span>
      <div class="seg" role="group" aria-label="Grosor del cartón"><button type="button" data-t="2">2 mm</button><button type="button" data-t="3">3 mm</button><button type="button" data-t="4">4 mm</button></div>
      <button id="pdf" class="descarga" type="button" hidden><span id="pdf-txt">Descargar plantillas 1:1 (PDF, A4)</span></button>
      <span id="pdf-estado" class="ayuda" aria-live="polite">Los PDF también están en <span class="mono">casita_carton/</span>, junto al proyecto.</span>
    </div>
    <div class="leyenda-l" aria-hidden="true">
      <span><svg viewBox="0 0 30 10"><path d="M1 5H29" stroke="currentColor" stroke-width="1.6"/></svg>Corte</span>
      <span><svg viewBox="0 0 30 10"><path d="M1 5H29" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 2.5"/></svg>Corte opcional (MQ-2)</span>
      <span><svg viewBox="0 0 30 10"><path d="M1 5H29" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="7 2 1.5 2"/></svg>Doblez</span>
      <span><svg viewBox="0 0 30 10"><path d="M1 5H29" stroke="var(--kraft-ink)" stroke-width="1.2" stroke-dasharray="2.5 2"/></svg>Marca de lápiz: dónde va otra pieza</span>
      <span><svg viewBox="0 0 30 10"><path d="M1 5H29M0 7L3 3M27 7L30 3" stroke="var(--ink-3)" stroke-width="1"/></svg>Medida</span>
    </div>
    <div id="laminas"></div>
    <h3 class="grupo-t">Lista de corte</h3>
    <div class="tbl"><table><thead><tr><th>Pieza</th><th>Material</th><th class="n">Cant.</th><th class="n">Medida (mm)</th><th>Cómo</th></tr></thead><tbody id="lista"></tbody></table></div>
  </section>

  <section>
    <div class="sec-head"><h2>Dónde va cada componente</h2><p>Medidas de tienda: midan sus módulos antes de pegar. Todo lo de la bandeja va con cinta doble contacto.</p></div>
    <div class="tbl"><table><thead><tr><th>Componente</th><th>Ubicación y fijación</th><th class="n">Medida</th></tr></thead><tbody id="componentes"></tbody></table></div>
  </section>

  <section>
    <div class="sec-head"><h2>Armado</h2><p>Prueben cada encaje antes de pegar: un corte a mano se desvía 1 mm con facilidad.</p></div>
    <ol class="pasos">
      <li><b>Midan el cartón y elijan el grosor.</b> <span>Impriman el PDF de ese grosor al 100 % y comprueben el cuadrado de 50 mm. Peguen las hojas sobre el cartón con goma en barra.</span></li>
      <li><b>Corten con cúter y regla metálica.</b> <span>Varias pasadas suaves, no una fuerte. Primero los huecos y después el contorno. Guarden la pieza que sale del hueco de la puerta: es la hoja.</span></li>
      <li><b>Armen la bandeja.</b> <span>Sobre el piso van las tiras exteriores: las de frente y atrás de largo completo, y las de los lados entre ellas. Las interiores van pegadas por dentro. Prueben la tapa antes de que enfríe la silicona.</span></li>
      <li><b>Armen la tapa.</b> <span>Con el jardín boca abajo, peguen las paredes de frente y atrás, y los lados entre ellas. La ranura del USB y el agujero del jack se marcan con el ESP32 y el jack en su lugar.</span></li>
      <li><b>Peguen la casa.</b> <span>Sobre el cuadrado marcado en el jardín: frente y fondo, y los lados entre ellos. Los vidrios van por dentro; los marcos y la corona, por fuera.</span></li>
      <li><b>Monten la puerta.</b> <span>Una tira de cinta masking por dentro, en el lado izquierdo, desde abajo hasta 22 mm de alto. La hoja debe girar libre, con 0,5 mm de luz a los lados y sobre el umbral.</span></li>
      <li><b>Peguen los sensores de la puerta.</b> <span>El imán va arriba de la hoja, por dentro, al ras de su borde izquierdo: sobresale 9 mm a la derecha y apoya en la pared al cerrar. El reed va justo encima, en la pared, a 2 mm del imán. El SW-420 va con silicona en la pared izquierda, junto al frente.</span></li>
      <li><b>Encastren el servo.</b> <span>Pasen el cuerpo por el agujero del piso hasta que las aletas apoyen, y fíjenlas con sus tornillos o con silicona. En reposo, el brazo apunta hacia atrás. Llévenlo a trabado y peguen capas de cartón en su cara hacia la puerta hasta que quede a 1–2 mm de ella.</span></li>
      <li><b>Monten la electrónica.</b> <span>Calza y shield atrás a la izquierda, protoboard al centro, LM2596 atrás a la derecha y relé adelante a la derecha. Dejen unos 10 cm de cable de sobra: la tapa se levanta con la casa.</span></li>
      <li><b>Cierren con el techo y la decoración.</b> <span>Tapón centrado bajo la base, tímpanos en los extremos, faldones encima y la nieve doblada en la cumbrera. Después, chimenea, árboles, muñeco, regalos y caminito sobre sus marcas.</span></li>
    </ol>
  </section>

  <section>
    <div class="sec-head"><h2>Comprobaciones</h2><p>Hechas sobre estas mismas piezas, con cartón de <span class="t-actual">3</span> mm y las medidas de tienda de cada módulo.</p></div>
    <div class="tbl"><table><thead><tr><th>Prueba</th><th>Resultado</th></tr></thead><tbody id="checks-t"></tbody></table></div>
    <p class="nota">No se probó con cartón real ni la fuerza del servo contra la puerta. El generador y los PDF están en <span class="mono">casita_carton/</span>, junto al proyecto.</p>
  </section>
</div>
<script type="application/json" id="checks">${checks}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
${modulo(leer('carton.mjs'), 'Carton', ['modelo', 'GROSORES'])}
${modulo(leer('dibujo.mjs'), 'Dibujo', ['svgPieza', 'fmt'])}
${leer('visor.js')}
</script>
`;
writeFileSync(salida, html);
console.log(salida, (html.length / 1024).toFixed(0), 'KB');
