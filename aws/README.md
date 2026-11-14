# Backend en AWS

Todo corre en la región us-east-1 y no hay servidor propio. La documentación completa, con el endpoint, la URL de la API y el PIN, está en `privado/` y no se sube.

| Servicio | Recurso | Qué hace |
|---|---|---|
| IoT Core | Objeto `esp32_puerta`, certificado y política | Broker MQTT (TLS, 8883) y autenticación del ESP32 |
| Reglas de IoT | `GuardarEventosPuerta`, `GuardarEstadoPuerta` | Guardan los mensajes en DynamoDB, sin código |
| DynamoDB | `EventosPuerta` (`dispositivo` + `timestamp`), `EstadoPuerta` (`dispositivo`) | Historial de eventos y último estado |
| Lambda (Python 3.13) | `abrirPuerta`, `consultarPuerta` | Validar el PIN y enviar la orden; responder consultas |
| API Gateway | `api_puerta` (HTTP API) | URL pública HTTPS para la app |
| IAM y CloudWatch | Roles y políticas por servicio | Permisos mínimos y registros de las Lambdas |

## Archivos

```
aws/
├── iot/
│   ├── reglas.sql            consultas de las dos reglas
│   └── politica_esp32.json   permisos mínimos del ESP32 (CUENTA = ID de 12 dígitos)
└── lambdas/                  por agregar: abrirPuerta.py y consultarPuerta.py
```

El código de las Lambdas se baja desde la consola (cada función → Acciones → Exportar función) o se copia del editor. Las variables de entorno no se copian aquí, porque una de ellas es el PIN.

| Lambda | Variables de entorno | Permisos |
|---|---|---|
| `abrirPuerta` | `IOT_ENDPOINT`, `PIN_PUERTA`, `TABLA_EVENTOS` | `iot:Publish` en `casa/puerta/comandos`, `dynamodb:PutItem` en `EventosPuerta` |
| `consultarPuerta` | `TABLA_EVENTOS`, `TABLA_ESTADO` | `dynamodb:Query` en `EventosPuerta`, `dynamodb:GetItem` en `EstadoPuerta` |

## Contrato de la API

CORS abierto (`*`, `GET`/`POST`/`OPTIONS`, encabezado `content-type`), sin autorizador y con un límite de 5 solicitudes por segundo (ráfaga de 10).

**`POST /abrir`**, con `Content-Type: application/json`:

```json
{ "pin": "XXXXXX" }
```

| Código | Respuesta |
|---|---|
| 200 | `{ "success": true, "mensaje": "Comando de apertura enviado", "request_id": "..." }` |
| 401 | `{ "success": false, "mensaje": "PIN incorrecto" }` |
| 400 | `{ "success": false, "mensaje": "JSON inválido" }` |

**`GET /eventos?limite=50`** (por defecto 20, máximo 100), del más reciente al más antiguo:

```json
{ "eventos": [ { "dispositivo": "esp32_puerta", "timestamp": "2026-11-11T20:35:00.123Z",
                 "tipo": "humo", "nivel": "critico", "mensaje": "Se detectó humo o gas" } ] }
```

**`GET /estado`**:

```json
{ "puerta": "cerrada", "dispositivo": "conectado", "ultima_conexion": "2026-11-11T20:40:12.000+00:00" }
```

`puerta` puede ser `abierta`, `cerrada` o `desconocida`. `dispositivo` pasa a `desconectado` si no llegó nada del ESP32 en 2 minutos.

## Pendiente

- Probar todo con el ESP32 real.
- Tabla con el historial de latidos (hoy `EstadoPuerta` guarda solo el último).
- Lambda de métricas con la ruta `GET /metricas`.
- Ruta para marcar una alerta como falsa.
- Cambiar el PIN de ejemplo antes de la presentación.
