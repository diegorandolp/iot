import json
import os
import uuid
import hmac
from datetime import datetime, timezone

import boto3

iot = boto3.client("iot-data", endpoint_url="https://" + os.environ["IOT_ENDPOINT"])
tabla = boto3.resource("dynamodb").Table(os.environ["TABLA_EVENTOS"])

TOPIC_COMANDOS = "casa/puerta/comandos"


def respuesta(codigo, datos):
    return {
        "statusCode": codigo,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(datos, ensure_ascii=False),
    }


def guardar_evento(tipo, nivel, mensaje):
    ahora = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    tabla.put_item(Item={
        "dispositivo": "esp32_puerta",
        "timestamp": ahora,
        "tipo": tipo,
        "nivel": nivel,
        "mensaje": mensaje,
    })


def lambda_handler(event, context):
    # Acepta tanto la prueba directa como la llamada desde API Gateway
    body = event.get("body", event)
    if isinstance(body, str):
        try:
            body = json.loads(body or "{}")
        except json.JSONDecodeError:
            return respuesta(400, {"success": False, "mensaje": "JSON inválido"})

    pin = str(body.get("pin", ""))
    if not hmac.compare_digest(pin.encode(), os.environ["PIN_PUERTA"].encode()):
        guardar_evento("pin_incorrecto", "advertencia", "Intento de apertura con PIN incorrecto")
        return respuesta(401, {"success": False, "mensaje": "PIN incorrecto"})

    request_id = str(uuid.uuid4())
    comando = {"accion": "abrir", "duracion_ms": 3000, "request_id": request_id}
    iot.publish(topic=TOPIC_COMANDOS, qos=1, payload=json.dumps(comando))

    guardar_evento("apertura", "info", "Puerta abierta desde la app")
    return respuesta(200, {
        "success": True,
        "mensaje": "Comando de apertura enviado",
        "request_id": request_id,
    })
