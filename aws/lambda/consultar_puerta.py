import json
import os
import time
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")
tabla_eventos = dynamodb.Table(os.environ["TABLA_EVENTOS"])
tabla_estado = dynamodb.Table(os.environ["TABLA_ESTADO"])

DISPOSITIVO = "esp32_puerta"
LIMITE_DESCONEXION_MS = 120_000  # 2 minutos sin mensajes = desconectado


def convertir(o):
    if isinstance(o, Decimal):
        return int(o) if o % 1 == 0 else float(o)
    raise TypeError


def respuesta(codigo, datos):
    return {
        "statusCode": codigo,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(datos, ensure_ascii=False, default=convertir),
    }


def obtener_eventos(event):
    params = event.get("queryStringParameters") or {}
    try:
        limite = max(1, min(int(params.get("limite", 20)), 100))
    except ValueError:
        limite = 20

    resultado = tabla_eventos.query(
        KeyConditionExpression=Key("dispositivo").eq(DISPOSITIVO),
        ScanIndexForward=False,  # del más reciente al más antiguo
        Limit=limite,
    )
    return respuesta(200, {"eventos": resultado.get("Items", [])})


def obtener_estado():
    item = tabla_estado.get_item(Key={"dispositivo": DISPOSITIVO}).get("Item")
    if not item:
        return respuesta(200, {"puerta": "desconocida", "dispositivo": "desconectado", "ultima_conexion": None})

    ultima_ms = int(item["ultima_conexion"])
    conectado = (time.time() * 1000 - ultima_ms) < LIMITE_DESCONEXION_MS
    ultima_iso = datetime.fromtimestamp(ultima_ms / 1000, tz=timezone.utc).isoformat()

    return respuesta(200, {
        "puerta": item.get("puerta", "desconocida"),
        "dispositivo": "conectado" if conectado else "desconectado",
        "ultima_conexion": ultima_iso,
    })


def lambda_handler(event, context):
    ruta = event.get("rawPath") or event.get("ruta", "")
    if ruta.endswith("/eventos"):
        return obtener_eventos(event)
    if ruta.endswith("/estado"):
        return obtener_estado()
    return respuesta(404, {"mensaje": "Ruta no encontrada"})
