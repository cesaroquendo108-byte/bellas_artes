# Workflows open source

Los pesos de Flux, HunyuanVideo, F5-TTS y RVC no se guardan en Git. Cada
workflow debe exportarse desde ComfyUI en formato API y configurarse como
variable de entorno `WORKFLOW_*` antes de activar `GENERATION_ENABLED`.

Versiones esperadas:

- `image/flux-schnell-v1`
- `image/flux-dev-v1`
- `video/hunyuan-8b-v1`
- `video/hunyuan-13b-v1`
- `audio/f5-tts-es-v1`
- `audio/rvc-v1`
- `characters/flux-reference-v1`
- `worlds/flux-world-v1`

No se generan resultados de prueba si falta el workflow. El worker marca el
job como fallido y devuelve la reserva cuando el proveedor no puede ejecutarlo.
