# Aplicación móvil

Aquí va el proyecto de la app, tal como lo crea su framework (con su propio `.gitignore`).

La app nunca habla con IoT Core ni con el ESP32. Todo pasa por API Gateway, y las rutas, cuerpos y respuestas están en [`../aws/README.md`](../aws/README.md#contrato-de-la-api).

## Configuración

- La URL de la API va en un archivo de configuración que no se sube, por ejemplo `.env`, y en el repositorio queda un `.env.example` con el valor vacío. La URL real está en `privado/`.
- El PIN no va en el código. Lo escribe quien abre la puerta.

## Qué muestra

- Si la puerta está abierta o cerrada y si el nodo está conectado (`GET /estado`).
- El historial de eventos (`GET /eventos`), con los tipos de [`../esp32/README.md`](../esp32/README.md#tipos-de-evento).
- El botón para abrir con PIN (`POST /abrir`).
- Las seis métricas del informe y el botón para marcar una alerta como falsa, cuando existan esas rutas en AWS.

## A tener en cuenta

- Las fechas llegan en UTC, y Perú está en UTC−5.
- Consultar cada 10 a 30 s. La API acepta 5 solicitudes por segundo.
- Revisar `GET /estado` antes de abrir. Si el ESP32 está desconectado, la orden se pierde aunque la API responda `success: true`.

Las capturas para el informe y la presentación van en `informe/Imagenes/app.png` (ver `informe/LEEME.txt`).
