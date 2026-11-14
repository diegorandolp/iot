# Firmware del ESP32

Aquí va el sketch que corre en el nodo. Arduino exige que la carpeta se llame igual que el `.ino`:

```
esp32/
└── ESP32_AWS/
    ├── ESP32_AWS.ino
    ├── secrets.h            ← no se sube (está en .gitignore)
    └── secrets.example.h    ← misma estructura, valores vacíos
```

## secrets.h

Lleva el Wi-Fi, el endpoint de IoT Core, el Amazon Root CA 1, el certificado del dispositivo y su clave privada (el contenido completo de cada `.pem`). Se pasa por privado y nunca se sube a GitHub ni a grupos. Para que el resto pueda compilar, copien `secrets.h` como `secrets.example.h` y borren los valores.

## Compilar y cargar

- Arduino IDE con la placa **ESP32 Dev Module**.
- Librerías: PubSubClient, ArduinoJson y ESP32Servo (`WiFi.h` y `WiFiClientSecure.h` ya vienen con el ESP32).
- Monitor serie a 115200. Debe mostrar Wi-Fi OK, NTP OK y la conexión a AWS. Si sale `estado=-2`, revisen el endpoint, los certificados o la hora.
- El Client ID es `esp32_puerta` y el puerto es 8883.

## Pines

Ajusten las constantes al inicio del `.ino` si el armado cambia, y actualicen también la tabla de pines del informe (`informe/main.tex`, `tab:pines`).

| Señal | GPIO | Modo |
|---|---|---|
| PIR | 27 | Entrada |
| MC-38 | 26 | `INPUT_PULLUP`, el otro cable a GND |
| SW-420 | 25 | Entrada |
| Relé IN1 (buzzer) | 23 | Salida |
| Servo (PWM) | 18 | Salida |
| MQ-2 (opcional) | 34 | ADC1, con divisor |

El servo toma 5 V del LM2596, nunca del pin de 5 V del ESP32, y todas las tierras van unidas.

## Comportamiento

1. Se suscribe a `casa/puerta/comandos`. Al recibir `{"accion":"abrir","duracion_ms":3000,...}` suelta el pestillo durante `duracion_ms`, y en ese lapso el MC-38 no cuenta como intrusión.
2. Correlaciona en 10 s. Un sensor solo es `leve` y dos sensores distintos son `critico`, con buzzer y bloqueo locales en el acto.
3. Publica cada evento en `casa/puerta/eventos` con `tipo`, `nivel`, `mensaje`, `seq` y `ts_evento` (hora del ESP32 en ms, por NTP). No usa el campo `timestamp`, porque AWS lo usa para la hora de recepción.
4. Publica un latido en `casa/puerta/estado` cada 30 s y cada vez que la puerta cambia.

```json
// casa/puerta/eventos
{"tipo": "vibracion", "nivel": "critico", "mensaje": "Posible intento de ingreso forzado",
 "seq": 128, "ts_evento": 1794614400123}
// casa/puerta/estado
{"puerta": "cerrada", "rssi": -61, "seq": 129, "ts_evento": 1794614430000}
```

## Tipos de evento

| `tipo` | `nivel` | Origen |
|---|---|---|
| `vibracion` | `leve` o `critico` | SW-420 |
| `movimiento` | `leve` o `critico` | PIR |
| `puerta_forzada` | `leve` o `critico` | MC-38 sin orden previa |
| `humo` | siempre `critico` | MQ-2 (opcional) |
| `pin_incorrecto` | `advertencia` | AWS (`abrirPuerta`) |
| `apertura` | `info` | AWS (`abrirPuerta`) |

## Para la demo

El Wi-Fi de la universidad pide iniciar sesión en una página y el ESP32 no puede hacerlo. Usen el hotspot de un celular y pruébenlo antes.
