-- Reglas de IoT Core (SQL versión 2016-03-23, acción DynamoDBv2).
-- En la consola se pega solo el SELECT, sin estos comentarios.

-- GuardarEventosPuerta: casa/puerta/eventos -> EventosPuerta (rol rol_iot_dynamodb).
-- Agrega el dispositivo y la hora de recepción en UTC.
SELECT *, 'esp32_puerta' AS dispositivo,
       parse_time("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timestamp()) AS timestamp
FROM 'casa/puerta/eventos'

-- GuardarEstadoPuerta: casa/puerta/estado -> EstadoPuerta (rol rol_iot_estado).
-- Agrega la hora de la última conexión en milisegundos.
SELECT *, 'esp32_puerta' AS dispositivo, timestamp() AS ultima_conexion
FROM 'casa/puerta/estado'
