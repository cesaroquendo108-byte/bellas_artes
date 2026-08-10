# Workflows open source

Los pesos de Flux, HunyuanVideo, F5-TTS y RVC no se guardan en Git. Cada
workflow debe exportarse desde ComfyUI en formato API y guardarse como
`workflows/<modalidad>/<version>.json` y registrarse en
`src/lib/generation/workflows.ts`. `WORKFLOW_*` se conserva como override de
despliegue, pero no es obligatorio para el worker CPU.

`image/flux-schnell-v1.json` es el primer workflow API probado localmente con
el checkpoint público `flux1-schnell-fp8.safetensors`. El archivo no contiene
pesos ni credenciales y sirve como plantilla para configurar
`WORKFLOW_IMAGE_FLUX_SCHNELL_V1` en el worker aislado.

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

Vast.ai Serverless es el único proveedor GPU activo. Cada endpoint debe usar
`min_load=0`, `cold_workers=0` y `max_workers=1`; las GPU temporales de
depuración se apagan tras 10 minutos de inactividad.
