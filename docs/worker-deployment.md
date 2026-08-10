# Worker externo de generación

El worker de BullMQ no se ejecuta dentro de Vercel. Vercel autentica las
solicitudes, valida ownership, reserva créditos y encola jobs; este proceso
externo consume Redis, consulta Vast.ai Serverless y persiste resultados reales en
R2 mediante Supabase service role.

## Imagen

Construir la imagen desde la raíz del repositorio:

```bash
docker build -f Dockerfile.worker -t bellas-artes-generation-worker:e1a3b93 .
```

Arrancarla sólo en un host externo con un archivo de entorno fuera del
repositorio:

```bash
docker run --name bellas-artes-generation-worker \
  --restart unless-stopped \
  --env-file /secure/bellas-artes-worker.env \
  bellas-artes-generation-worker:e1a3b93
```

## Variables del host externo

El worker necesita como mínimo:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET
REDIS_URL
BULLMQ_PREFIX=bellas-artes
RUN_GENERATION_WORKER=true
GENERATION_ENABLED=false
GENERATION_MAX_ATTEMPTS=3
WORKER_CONCURRENCY=1
WORKER_QUEUE_KINDS=image,video,audio,character,world
VAST_SERVERLESS_MIN_LOAD=0
VAST_SERVERLESS_COLD_WORKERS=0
VAST_SERVERLESS_MAX_WORKERS=1
VAST_SERVERLESS_INACTIVITY_TIMEOUT_SECONDS=600
VAST_DEBUG_IDLE_SHUTDOWN_MINUTES=10
VAST_API_KEY=<secreto de servidor>
VAST_IMAGE_SERVERLESS_ENDPOINT=ba-image-sandbox
VAST_SERVERLESS_ROUTE_URL=https://run.vast.ai/route/
GENERATION_JOB_TIMEOUT_SECONDS=600
```

Para activar una modalidad se añaden únicamente sus variables de proveedor y
workflows versionados. Nunca se copian estas credenciales a Vercel ni a
variables públicas del navegador:

```text
VAST_IMAGE_SERVERLESS_ENDPOINT
VAST_VIDEO_SERVERLESS_ENDPOINT
VAST_AUDIO_SERVERLESS_ENDPOINT
VAST_CHARACTER_SERVERLESS_ENDPOINT
VAST_WORLD_SERVERLESS_ENDPOINT
VAST_OUTPUT_ALLOWED_HOSTS
```

Las URLs `VAST_*_COMFY_BASE_URL` y `VAST_COMFY_API_KEY` existen sólo para un
ComfyUI directo heredado. Vast Serverless normal no ofrece una URL GPU fija:
el worker obtiene una asignación efímera por nombre de endpoint y envía el
workflow al PyWorker oficial.

Mientras `GENERATION_ENABLED=false`, el worker puede permanecer empaquetado y
detenido como infraestructura preparada. No se deben reservar créditos ni
crear assets de prueba para comprobar el proceso.

## Estado de este despliegue

La imagen y el runbook están preparados en la consolidación. El worker CPU debe
vivir en un host persistente; la GPU se provisiona únicamente mediante Vast.ai
Serverless con escala a cero y un worker máximo. El primer job será admin-only
y la activación pública seguirá bloqueada hasta completar la aceptación.
