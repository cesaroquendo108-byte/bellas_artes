# Freefield Workflows en Bellas Artes

Este directorio contiene el catálogo de 120 aplicaciones y grafos de ComfyUI API reconstruidos a partir de Higgsfield sobre modelos de pesos abiertos (open weights).

- Repositorio del proyecto: https://github.com/cesaroquendo108-byte/freefield
- Upstream original: https://github.com/neuregex/freefield
- Licencia: MIT
- Total de aplicaciones: 120

## Estructura de cada app (`apps/<id>/`)

Cada aplicación es autocontenida y se compone de:
1. `app.json`: Manifiesto declarativo que describe:
   - Identificador, nombre, sección (`video`, `image`, `audio`, `utility`) y función Higgsfield equivalente.
   - Entradas tipadas (`text`, `textarea`, `number`, `slider`, `select`, `toggle`, `seed`, `image`, `video`).
   - Mapeos de enlace (`bind`) que conectan cada campo del formulario directamente a un nodo y propiedad del grafo ComfyUI.
   - Salidas declaradas (`node`, `type`).
   - Checkpoints y LoRAs requeridos con consumo de VRAM estimado.
2. `workflow.api.json`: Grafo JSON nativo de ComfyUI listo para ser enviado al endpoint `/prompt` del worker o Vast.ai Serverless.

## Flujos Destacados Integrados

- `recast`: Character Swap en video con retención de movimiento (SCAIL-2 + SAM 3.1).
- `genjutsu`: Composición de clips a partir de hoja de ingredientes IC-LoRA con LTX-2.5.
- `motion-transfer`: Transferencia de movimiento de video a personaje con Wan Animate 2.
- `character-swap`: Sustitución de personaje en imagen fija con FLUX 3 Klein.
- `cinema-studio`: Control de cámara y composición cinematográfica.
- `camera-moves`: Movimientos y paneos controlados de cámara.
- `relight`: Relighting con mapas de iluminación controlados.
- `upscale-video`: Escalado y refinamiento temporal de video.
