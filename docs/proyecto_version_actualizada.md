# Sistema inteligente de seguridad residencial IoT con monitoreo inalámbrico y alertas en tiempo real

**Versión actualizada del proyecto: 4 de noviembre de 2026**
CS5055 Internet de las Cosas, UTEC, 2026-2
Ariann Abigail Salcedo Quiroz, Diego Randolp Quispe Apaza, Federico Iribar Casanova, Sofia del Pilar Salazar Mendoza

> **Estado:** propuesta de diseño. Falta la validación del profesor y el circuito aún no se ha probado.

## 1. Resumen

Una casa impresa en 3D, de tamaño demostrativo, protege una puerta con tres sensores conectados a un ESP32. Si dos sensores distintos se activan en menos de 10 s, el ESP32 activa la alarma y el bloqueo sin depender de Internet. Cada evento se publica por MQTT/TLS a un servidor en AWS, y una aplicación web calcula métricas de desempeño.

## 2. Qué cambió respecto al perfil (P1)

| Aspecto | Perfil P1 | Versión actual | Motivo |
|---|---|---|---|
| Zona de prueba | Puerta de prueba de MDF o puerta real | Casa pequeña impresa en 3D | Solo es demostrativa |
| Alarma | Sirena 12 V, 15 W | Buzzer activo SFM-20B (3–24 V) a 12 V | Tamaño y uso en aula |
| Bloqueo | Cerradura solenoide 12 V | Servo SG90 que mueve un pestillo impreso | Cabe en la casa y consume menos |
| Conexiones | Placa perforada y borneras | Shield de borneras y protoboard, sin PCB | Más simple; se renuncia al bonus de PCB |
| Puerta | MDF y bisagras | Puerta y bisagra impresas | Menos materiales |
| Fijación | Tornillería, tarugos | Cinta doble contacto, oculta | Menos materiales |

No cambian: los tres sensores, el ESP32, la regla de 10 s, MQTT/TLS, AWS, la aplicación web ni las 6 métricas.

## 3. Componentes

### Núcleo

| Capa | Componente | Función |
|---|---|---|
| Sensores | PIR HC-SR501 | Detecta movimiento |
| Sensores | Magnético MC-38 | Detecta la apertura de la puerta |
| Sensores | Vibración SW-420 | Detecta golpes en la puerta |
| Procesamiento | ESP32 DevKit V1 | Lee sensores, decide, actúa y publica |
| Actuación | Módulo de relés de 2 canales | CH1 conmuta el buzzer; CH2 queda libre |
| Actuación | Buzzer activo SFM-20B | Alarma sonora |
| Actuación | Servo SG90 | Pestillo de bloqueo |
| Alimentación | Fuente 12 V, 2 A y jack DC | Entrada de energía |
| Alimentación | Convertidor LM2596 | Baja de 12 V a 5,0 V |
| Alimentación | Capacitor 1000 µF, 25 V | Amortigua caídas de 5 V al mover el servo |
| Conexiones | Shield de borneras ESP32 | Conexiones firmes para la demo en vivo |
| Conexiones | Protoboard 400 puntos y Dupont | Reparto de 5 V y GND |
| Carcasa | Casa impresa en PLA | Oculta la electrónica en un compartimento |
| Nube | AWS EC2 t3.micro | Mosquitto, FastAPI y SQLite en Docker Compose |
| Interfaz | Aplicación web propia | Eventos, estado y métricas |

### Opcionales, solo si el núcleo queda terminado

- ESP32-CAM: ya la tienen. Fotografía cada evento crítico.
- Sensor MQ-2: ya lo tienen. Necesita un divisor 10 kΩ/20 kΩ y un pin de ADC1.

## 4. Arquitectura

```
Fuente 12 V ─ jack ─┬─ relé CH1 (COM → NO) ─ buzzer SFM-20B ─ GND
                    │
                    └─ LM2596 (5,0 V) ─ protoboard 5 V/GND
                                         ├─ ESP32 (VIN)
                                         ├─ PIR
                                         ├─ módulo de relés
                                         └─ servo SG90 (+ capacitor 1000 µF)

ESP32 ─ Wi-Fi, MQTT/TLS (8883) ─ Mosquitto en AWS ─ FastAPI + SQLite ─ app web (HTTPS)
```

Reglas de conexión:

- El servo se alimenta del LM2596, nunca del pin de 5 V del ESP32.
- Todas las tierras van unidas.
- El LM2596 se ajusta a 5,0 V con multímetro antes de conectar nada.
- El SW-420 se alimenta con 3,3 V para que su salida no pase de 3,3 V.
- El relé va con el jumper en H, para que active con la señal de 3,3 V del ESP32.

### Pines propuestos (por validar en el armado)

| Señal | GPIO | Modo |
|---|---|---|
| PIR | 27 | Entrada |
| MC-38 | 26 | `INPUT_PULLUP`, el otro cable a GND |
| SW-420 | 25 | Entrada |
| Relé IN1 (buzzer) | 23 | Salida |
| Servo (PWM) | 18 | Salida |
| MQ-2 (opcional) | 34 | Entrada ADC1, con divisor |

Se evitan GPIO 6–11 (flash) y los de arranque 0, 2, 12 y 15.

### Presupuesto de corriente (estimado)

| Escenario | Corriente en 12 V | Uso de la fuente de 2 A |
|---|---|---|
| Diseño anterior, sirena y cerradura a la vez | 2,26 A | Excedía la fuente |
| Diseño actual, peor caso | ≈ 0,7 A | ≈ 35 % |
| Diseño actual con ESP32-CAM y MQ-2 | ≈ 0,9 A | ≈ 45 % |

El peor caso supone el servo atascado a unos 0,7 A, un valor estimado. Ya no se necesita la fuente de 4,2 A.

## 5. Lógica de detección

1. El ESP32 lee los tres sensores en un ciclo continuo.
2. Si se activa uno, revisa si otro sensor distinto se activó en los últimos 10 s.
3. **Alerta leve (un solo sensor):** publica el evento, sin alarma.
4. **Evento crítico (dos sensores distintos):** activa el buzzer y el bloqueo, y publica el evento.
5. Cada mensaje lleva sensor, nivel, número de secuencia y hora NTP.
6. Cada 30 s se envía un latido con el RSSI.

Detalle nuevo por el servo: el pestillo solo se mueve si el MC-38 indica puerta cerrada. Si la puerta está abierta, el bloqueo queda pendiente hasta que se cierre, para que el pestillo no choque con ella.

## 6. Interfaz y métricas

| Métrica | Cálculo |
|---|---|
| Latencia | Recepción menos hora del evento; promedio y p95 |
| Pérdida | Huecos en el número de secuencia, en % |
| Disponibilidad | Latidos recibidos sobre esperados, en % |
| Eventos | Conteo por sensor y por hora |
| Falsas alarmas | Alertas marcadas como falsas sobre el total |
| Enlace | RSSI promedio en dBm |

## 7. Carcasa

- La casa tiene un compartimento, por ejemplo en la base, que oculta toda la electrónica.
- Su tamaño mínimo sale de medir shield, relé, LM2596 y protoboard antes de modelarla.
- El jack va en una pared; el PIR y el buzzer asoman por aberturas.
- Puerta, bisagra y pestillo también se imprimen.
- El curso evalúa el acabado visual y profesional, así que no deben verse cables ni cinta.

Calibración para la demo: bajar la sensibilidad del PIR y limitar su campo de visión, porque alcanza hasta 7 m. El SW-420 va pegado firme a la puerta y se ajusta con su potenciómetro.

## 8. Objetivos

**General:** diseñar e implementar un sistema inteligente de seguridad residencial IoT que detecte intrusiones con tres sensores, clasifique el riesgo en un ESP32, responda con alarma sonora y bloqueo, y avise por Wi-Fi a una aplicación web que mida su propio desempeño.

**Específicos:**

- Detectar movimiento, apertura y vibración con los sensores PIR, MC-38 y SW-420.
- Clasificar cada evento como leve o crítico con la regla de 10 s.
- Activar la alarma sonora y el bloqueo por servo sin depender de Internet.
- Publicar los eventos por MQTT hacia AWS con latencia menor a 2 s en el percentil 95.
- Desarrollar una aplicación web con 6 métricas de desempeño.
- Montar el hardware dentro de una casa impresa en 3D.
- (Opcional) Agregar ESP32-CAM y sensor MQ-2.

## 9. Alcances y limitaciones

**Alcances:** un prototipo a escala con una puerta, un PIR, un sensor magnético y un sensor de vibración. Incluye un nodo ESP32, buzzer, bloqueo por servo, servidor en AWS y aplicación web.

**Limitaciones:**

- Es una maqueta demostrativa: el servo y el pestillo impresos no resisten una fuerza real y el buzzer no equivale a una sirena comercial.
- Una zona y un solo nodo, con Wi-Fi de 2,4 GHz.
- Sin Internet, la alarma y el bloqueo siguen funcionando, pero la aplicación no recibe eventos.
- Sin batería de respaldo.
- No cubre sabotaje del cableado ni interferencia de radio.
- Si el laboratorio bloquea el puerto 8883, se usará un punto de acceso móvil.

## 10. Cumplimiento de requisitos (sección 1.1 del curso)

| Requisito | Estado | Cómo se cumple |
|---|---|---|
| Mínimo 3 sensores | Cumple | PIR, MC-38, SW-420 |
| Mínimo 1 actuador funcional | Cumple | Buzzer y servo |
| Comunicación inalámbrica | Cumple | MQTT sobre Wi-Fi |
| Interfaz con procesamiento previo | Cumple | 6 métricas calculadas en el backend |
| Carcasa 3D | Depende del acabado | Casa con compartimento oculto |
| App móvil | Opcional, no incluida | No es obligatoria |
| PCB propia | Bonus, no incluido | No es obligatoria |

## 11. Pendientes

**Decisiones:**

- [ ] Validar con el profesor el cambio de actuadores.
- [ ] Confirmar quién imprime la casa y quién pone el PLA.
- [ ] Confirmar si el LM2596, los capacitores y las resistencias ya están disponibles.
- [ ] Corregir la fila 3 del Excel: dice SERVOMOTOR con las especificaciones del MC-38.

**Actualizar en el informe y las diapositivas:**

- [ ] Tabla de componentes, alcances, limitaciones y objetivos.
- [ ] Diagrama de bloques: LM2596, servo y buzzer.
- [ ] Diapositivas 7, 8 y 9, y la frase "los actuadores usan la fuente de 12 V".
- [ ] Estado del arte: 5 de 8 artículos son anteriores a 2019 y el informe final pide los últimos 7 años (Wälchli, Pugh, Ray, Al-Fuqaha y Jin).
- [ ] Plantilla: `main.tex` usa IEEEtran y la sugerida para el informe final es ACM.

**Entregables del informe final (viernes 13 de noviembre):**

- [ ] Fotos reales del armado, con su contexto.
- [ ] Diagrama de flujo y diagrama de interconexiones.
- [ ] Al menos una figura de resultados propia.
- [ ] Descripción del mercado, con el enlace al video.
- [ ] Similitud menor al 20 % en Turnitin.

**Exposición (semana 15):**

- [ ] Demostración en vivo.
- [ ] Video publicitario con el prototipo y todos los integrantes frente a la cámara.
