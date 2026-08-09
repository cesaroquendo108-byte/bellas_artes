# Runbook de generación open source

La generación se ejecuta fuera de Vercel. Next.js sólo autentica, valida,
reserva créditos y encola jobs. El worker consume Redis y utiliza ComfyUI en
Vast.ai o un endpoint Serverless de RunPod como rebose.

## Activación segura

1. Crear Supabase Preview y aplicar las migraciones en orden numérico.
2. Crear Redis administrado y configurar `REDIS_URL` únicamente en el servidor
   y el worker.
3. Desplegar ComfyUI en Vast.ai con los pesos open source aprobados.
4. Exportar cada workflow de ComfyUI en formato API y cargarlo en las variables
   `WORKFLOW_*`. Los pesos no se guardan en Git.
5. Configurar los endpoints de RunPod por modalidad y límites de gasto.
6. Ejecutar el worker con `RUN_GENERATION_WORKER=true`.
7. Mantener `GENERATION_ENABLED=false` hasta probar un job completo en staging.

## Rutas y modelos

| Superficie | Estándar | Premium |
| --- | --- | --- |
| Imagen | Flux.1 Schnell FP8 | Flux.1 Dev FP16/BF16 |
| Video | HunyuanVideo 1.5 8.3B | HunyuanVideo 13B |
| TTS | F5-TTS español | pendiente de tarifa |
| Voice Changer | RVC/SO-VITS-SVC | pendiente de tarifa |
| Characters/Worlds | Flux con referencias | Flux Dev/LivePortrait |

Imagen reserva 1 crédito y video reserva 80 créditos. Audio, Characters y
Worlds permanecen sin captura hasta que exista una tarifa aprobada en la
política comercial.

## Diagnóstico

- `not_configured`: falta `GENERATION_ENABLED`, el endpoint del proveedor o el
  workflow requerido para la modalidad.
- `QUEUE_UNAVAILABLE`: la reserva se devuelve automáticamente.
- `WORKFLOW_NOT_CONFIGURED`: el worker devuelve la reserva; no crea asset.
- `PROVIDER_TIMEOUT`: se reintenta hasta tres veces y después se reembolsa.
- `completed`: sólo significa que existe un asset real en R2 vinculado al job.

No se deben crear imágenes, audios o videos simulados para resolver un error
de infraestructura.

## MCP real

La integración MCP expone el transporte Streamable HTTP en `/api/mcp` cuando la
aplicación Next está publicada. También existe `npm run mcp`, que arranca el
servidor independiente en `MCP_PORT` y expone `/mcp` y `/health` para un
despliegue separado.

Para habilitarlo se deben configurar en el servidor:

- `MCP_API_KEY`: secreto Bearer para el cliente MCP.
- `MCP_USER_ID`: UUID de un usuario Bellas Artes acotado; nunca llega desde el
  cliente.
- `MCP_ALLOWED_ORIGIN`: origen permitido, si se necesita restringir CORS.
- `NEXT_PUBLIC_MCP_SERVER_URL`: URL pública del endpoint desplegado, sólo para
  que la landing muestre instrucciones copiables.

El servidor ofrece tools para crear imagen/video, consultar jobs propios y
listar assets propios. La landing debe permanecer en “no configurada” hasta
que exista una URL pública, una API key rotada y una prueba de handshake en el
cliente que se vaya a soportar. No se debe compartir `MCP_API_KEY` con el
navegador ni afirmar compatibilidad operativa con Claude, ChatGPT o Cursor sin
probar cada integración contra el endpoint publicado.
