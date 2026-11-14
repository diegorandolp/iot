# Puerta inteligente con ESP32

Proyecto 2 del curso de IoT (CS5055, UTEC). Un ESP32 vigila la puerta de una casa de cartón a escala con un PIR, un MC-38 y un SW-420. Si dos sensores distintos se activan en menos de 10 s, hace sonar un buzzer y traba la puerta con un servo, sin esperar a Internet. Cada evento llega a AWS IoT Core por MQTT con TLS, y una aplicación móvil muestra el estado, el historial y las métricas, y abre la puerta con un PIN.

```
ESP32 ◀── MQTT/TLS ──▶ AWS IoT Core ── reglas ──▶ DynamoDB
                             ▲                       ▲
                             │ orden de abrir        │ lee y escribe
                             └──────── Lambda ───────┘
                                         ▲
                                    API Gateway
                                         ▲ HTTPS
                                     App móvil
```

## Estructura

```
.
├── esp32/        firmware del nodo (ESP32_AWS.ino) y su guía
├── app/          aplicación móvil
├── aws/          backend: reglas de IoT, política, Lambdas y contrato de la API
├── informe/      informe final (main.tex, ACM) y presentación (slides.tex, beamer)
│   ├── figuras/  diagramas y gráficos TikZ/pgfplots compartidos
│   └── Imagenes/ fotos y capturas propias
├── hardware/
│   ├── casita_carton/   plantillas PDF por grosor de cartón y su generador
│   ├── materiales/      lista de materiales y lista de compras
│   └── descartado/      versiones anteriores de la casa (Blender y STL para imprimir)
├── docs/
│   ├── CS5055_Proyectos262.pdf       enunciado del curso
│   ├── proyecto_version_actualizada.md   diseño del 4 de noviembre
│   ├── perfil_P1/                    perfil entregado (P1)
│   └── borrador_overleaf.zip         informe antes de la versión final
├── privado/      documentación de AWS con endpoint, URL y PIN (no se sube)
├── entregas/     zip para Overleaf, generado con make (no se sube)
└── Makefile
```

## Informe y presentación

```
make            # compila informe/main.pdf e informe/slides.pdf y arma entregas/informe_overleaf.zip
make informe    # solo el informe
make slides     # solo la presentación
make zip        # solo el zip para Overleaf
```

Necesita [tectonic](https://tectonic-typesetting.github.io) y `zip`. En Overleaf basta con subir el zip. Lo que falta completar está en rojo en los PDF y en `informe/LEEME.txt`.

## Secretos

Nunca se suben el `secrets.h` del ESP32, los certificados (`.pem`, `.crt`, `.key`), el `.env` de la app ni la carpeta `privado/`, y el `.gitignore` ya los excluye. El endpoint de IoT, la URL de la API y el PIN tampoco van en el informe ni en las diapositivas, porque se comparten.
