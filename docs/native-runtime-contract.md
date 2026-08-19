# Contrato HTTP del runtime nativo

Los modelos que no usan un grafo ComfyUI se conectan al worker mediante
`NativeHttpProvider`. Este transporte no implementa inferencia dentro de Next.js:
define el contrato que debe exponer cada imagen GPU con el vault montado.

## Seguridad y configuración

- Producción exige HTTPS.
- Todas las llamadas incluyen `Authorization: Bearer $NATIVE_RUNTIME_API_KEY`.
- El secreto sólo existe en el worker; nunca se entrega al navegador ni forma
  parte del body del job.
- Los outputs por URL sólo se descargan desde
  `NATIVE_RUNTIME_OUTPUT_ALLOWED_HOSTS`, `VAST_OUTPUT_ALLOWED_HOSTS` o el host R2
  de la cuenta configurada.
- `request_id` y `x-idempotency-key` contienen el UUID del job reservado en
  Supabase. El servidor debe devolver el mismo job ante reintentos.

Variables:

```text
NATIVE_RUNTIME_BASE_URL
NATIVE_{IMAGE,VIDEO,AUDIO,CHARACTER,WORLD}_RUNTIME_BASE_URL
NATIVE_RUNTIME_API_KEY
NATIVE_RUNTIME_OUTPUT_ALLOWED_HOSTS
```

La URL por modalidad prevalece sobre el fallback global.

## Endpoints obligatorios

### `GET /v1/health`

```json
{
  "status": "healthy",
  "version": "native-runtime-v1",
  "models": [
    {
      "id": "pixart-sigma",
      "revision": "commit-o-release-inmutable",
      "artifact_hash": "sha256",
      "operations": ["image/pixart-sigma-v1"]
    }
  ]
}
```

El worker rechaza el endpoint si el modelo solicitado no aparece cargado.

### `GET /v1/queue`

Devuelve `{ "depth": 0 }`. Un valor ausente o inválido se interpreta como cola
no disponible.

### `POST /v1/jobs`

```json
{
  "request_id": "uuid",
  "kind": "image",
  "model": "pixart-sigma",
  "operation": "image/pixart-sigma-v1",
  "input": { "prompt": "Ávila al amanecer" },
  "source_urls": [],
  "reference_urls": []
}
```

Respuesta mínima: `{ "id": "provider-job-id", "status": "queued" }`.

### `GET /v1/jobs/:id`

Estados aceptados: `queued`, `processing`, `completed`, `failed` y `canceled`.
Al completar debe incluir una salida:

```json
{
  "status": "completed",
  "output": {
    "filename": "resultado.png",
    "content_type": "image/png",
    "url": "https://host-r2-permitido/output"
  }
}
```

También se admite `data` base64 hasta 500 MiB. Video grande debe usar URL
firmada de corta duración. El worker valida el MIME contra el manifiesto de la
operación, persiste el resultado en R2 y sólo entonces completa el job.

### `DELETE /v1/jobs/:id`

Debe solicitar cancelación idempotente y liberar VRAM/archivos temporales.

## Enrutamiento actual

El transporte cubre los backends nativos declarados: PixArt-Sigma, Z-Image,
Qwen-Image, Wan 2.2, HunyuanVideo 1.5, HunyuanVideo original, LivePortrait,
F5-TTS y RVC. Cada servidor GPU todavía debe implementar y aceptar realmente
su inferencia; disponer de este contrato no convierte por sí solo el modelo en
`ready`.
