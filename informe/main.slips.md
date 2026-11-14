# Marcos de oración y deslices de main.human.tex

El texto original es de la misma hablante nativa de español, así que los deslices
del skill (pensados para inglés) se tradujeron a sus equivalentes en español.
Ninguno cae en el resumen, en leyendas de figuras o tablas, en definiciones, en
cifras, en nombres de modelos o en una oración que dé un resultado principal.

## Deslices (8 en unas 9 500 palabras)

| N.° | Tipo | Dónde | Texto con el desliz | Forma correcta |
|---|---|---|---|---|
| 1 | Artículo ausente ante una referencia a figura | Carcasa y armado | "como se ve en Figura 11" | "como se ve en la Figura 11" |
| 2 | Preposición | Aplicación móvil | "de acuerdo a su nivel" | "de acuerdo con su nivel" |
| 3 | Preposición | Interconexiones | "los pines en base a que no interfieren" | "los pines porque no interfieren" |
| 4 | Artículo de más | Problemática | "no depende de la Internet" | "no depende de Internet" |
| 5 | Dequeísmo | Backend en AWS | "demuestra de que tiene la clave privada" | "demuestra que tiene la clave privada" |
| 6 | Preposición | Alcances y limitaciones | "Consiste de un nodo ESP32" | "Consiste en un nodo ESP32" |
| 7 | Artículo ausente ante una referencia a figura | Programa del ESP32 | "como los de Figura 8" | "como los de la Figura 8" |
| 8 | Artículo de más | Backend en AWS | "En el IoT Core el ESP32 está registrado" | "En IoT Core el ESP32 está registrado" |

El tercer tipo del skill (sujeto expletivo omitido) no existe en español, que ya
omite el sujeto, así que no se usó.

## Marcos de oración (14 aplicados de 62 párrafos)

Cada marco es una oración de BAWE con las palabras de contenido borradas. Se
tradujeron las palabras de función (artículos, preposiciones, auxiliares,
conectores) y se llenó con el contenido del párrafo. En los otros 48 párrafos
ningún marco se podía llenar sin agregar o cambiar un dato, así que se omitieron,
como indica la regla del skill. Todos los marcos se registraron en
main.exemplars.json para no repetirlos.

| Párrafo (sección) | Marco original (BAWE) | Oración resultante |
|---|---|---|
| Introducción (primer párrafo) | A [N] is another [N] of [V] [N] [V] [N] | "Un hogar así es otro ejemplo de piezas aisladas, y por eso tarda en notar un evento de riesgo…" |
| Problemática (último párrafo) | And for [ADJ] [N], the [N] must [V] in [ADJ] | "Y por esa razón la decisión debe tomarse en el microcontrolador…" |
| Marco teórico (capas) | When we will [V] the [N] on the [ADJ] [N], we have to [V]… | "Cuando queremos ubicar cada parte del prototipo en ese esquema de tres capas, tenemos que mirar la Figura 1." |
| Borde y nube | Of [N] the [N] does not [ADV] [V] [N] on the [N] | "Por supuesto, el ESP32 no espera a la nube para decidir algo urgente…" |
| Actuadores | [ADV] the [N] [V] it, the [N] will [V] the [N] in the [N]… | "Apenas el ancho de un pulso PWM se lo indica, gira a un ángulo fijo y mueve un pestillo…" |
| Estado del arte (Nannung) | It is [ADJ] that the [N] can be [V] as [ADV] as [ADJ] | "Es evidente que su sistema no mide si los avisos llegan ni cuánto tardan…" |
| Estado del arte (Aprilia) | [N] and [N] was the [ADJ] [N] to [V] a [N]… | "El PIR y el buzzer son la parte de su hardware más parecida a la nuestra…" |
| Estado del arte (Mishra) | Such a [N] might be [ADJ] for [ADJ] [N] of the [ADJ] [N] | "Tal comparación resulta útil para justificar MQTT frente a CoAP…" |
| Componentes | In the [ADJ] [N], we can [V] that the [ADJ] [N] which can be [V] is [N] | "En el caso de la ESP32-CAM, vemos que la mejora que se puede agregar es opcional…" |
| Lógica de detección (puerta) | He [V] the [N] by [V] the [ADJ] [N] of [N] to a [N] | "La Lambda abrirPuerta valida el PIN comparando el valor escrito con el de su variable de entorno…" |
| Programa del ESP32 (secretos) | This is a [ADJ] [N] because a [ADJ] [N]… | "Es una buena práctica, ya que quien tenga la clave privada podría hacerse pasar por el nodo." |
| Aplicación móvil | [N] is a [N] which [V] an [N] in the [N] | "Estado es la primera pestaña, y muestra un punto verde o rojo…" |
| Discusión | This was [ADJ] to the [N] of [N] of the [N] | "Esto se debe al cambio de actuadores, que permitió quitar el relé, el conversor y la fuente de 12 V." |
| Conclusiones | Here [ADJ] and [ADJ] [N] and [N] are [V] as [ADJ] [N] in the [N] | "Aquí la regla de dos sensores y la ventana de 10 s funcionan como una lógica simple…" |

## Otras notas

- Reglas del autor (§7), traducidas: no hay "pero", "sin embargo" ni "asimismo"
  en el texto, y los dos puntos solo van antes de listas y en leyendas de color.
- check.py (perfil cs) solo advierte el "--" de los rangos de páginas de la
  bibliografía y un "2" añadido por la tokenización de "ESP32" (se nombra el
  ESP32 en una oración nueva). No cambia ningún dato.
