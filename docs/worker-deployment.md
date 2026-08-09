# Worker externo de generación

El worker de BullMQ no se ejecuta dentro de Vercel. Vercel autentica las
solicitudes, valida ownership, reserva créditos y encola jobs; este proceso
externo consume Redis, consulta ComfyUI/RunPod y persiste resultados reales en
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
```

Para activar una modalidad se añaden únicamente sus variables de proveedor y
workflows versionados. Nunca se copian estas credenciales a Vercel ni a
variables públicas del navegador:

```text
VAST_COMFY_BASE_URL
VAST_COMFY_API_KEY
RUNPOD_API_KEY
RUNPOD_*_ENDPOINT_ID
WORKFLOW_*
```

Mientras `GENERATION_ENABLED=false`, el worker puede permanecer empaquetado y
detenido como infraestructura preparada. No se deben reservar créditos ni
crear assets de prueba para comprobar el proceso.

## Estado de este despliegue

La imagen y el runbook están preparados en la consolidación. No se inicia un
contenedor remoto desde este repositorio porque el entorno actual no tiene
REDIS_URL, credenciales R2 ni un host externo/GPU asignado. El siguiente paso
operativo es proporcionar un Redis de Preview y elegir el host externo
(Vast.ai, RunPod u otro servidor Docker), aplicar el archivo de entorno allí y
comprobar el primer job admin-only con `GENERATION_ENABLED=false` hasta que la
activación sea aprobada.
