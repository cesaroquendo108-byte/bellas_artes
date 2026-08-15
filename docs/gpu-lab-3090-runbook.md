# Laboratorio privado RTX 3090

Este runbook deja preparada una ventana administrativa de 2–3 horas sin activar
la generación pública, cobrar créditos ni exponer secretos. El punto de entrada
es `/admin/testing`; el alquiler y la destrucción se controlan desde
`/admin/gpus`.

## Estado seguro

- `GENERATION_ENABLED=false`.
- `GENERATION_ACCESS_MODE=allowlist`.
- `GENERATION_BILLING_MODE=shadow`.
- Una sola GPU activa y un TTL máximo de 180 minutos.
- Reserva y topes de coste se revalidan en servidor antes de alquilar.
- El worker de ciclo de vida consulta cada 30 segundos la agenda durable de
  Supabase y debe tener heartbeat saludable; sin él el alquiler falla cerrado.
- Cada instancia recibe además un watchdog interno con su vencimiento exacto y
  la clave restringida que Vast inyecta para administrar únicamente esa
  instancia.
- La instancia se destruye al vencer el TTL. Destruir manualmente al terminar
  sigue siendo obligatorio para evitar almacenamiento residual.

## Secuencia de mañana

1. Entrar como operador y abrir `/admin/testing`.
2. Alquilar **Laboratorio 3090 · imagen pública** por 180 minutos. Elegir una
   RTX 3090 verificada, con al menos 24 GB de VRAM y buena descarga.
3. Esperar a que termine el bootstrap. El estado está en
   `/workspace/bellas-artes-lab/status.json` y el log en
   `/workspace/bellas-artes-lab/bootstrap.log`.
4. Copiar el comando **Túnel ComfyUI** mostrado por Bellas Artes y abrir
   `http://localhost:8188`.
5. En la carpeta de workflows **Bellas Artes**, ejecutar los casos 1–5 en orden.
6. Probar SD3.5, DWPose o video sólo si su bloqueo fue resuelto previamente y
   todavía queda tiempo.
7. Guardar tiempos, VRAM, coste y outputs privados. Volver a `/admin/gpus` y
   destruir la instancia.

## Qué prepara el bootstrap público

El script `infra/vast/bootstrap_3090_lab.sh` fija una revisión de ComfyUI,
descarga pesos públicos y deja cinco workflows en el perfil del operador:

- FLUX.1 Schnell FP8, fijado por commit, tamaño y SHA-256.
- FLUX.2 Klein 4B T2I.
- FLUX.2 Klein 4B image edit, con su modelo FP8 y decoder pequeño.
- Z-Image T2I.
- SDXL Base + Refiner oficiales.
- Real-ESRGAN x4 con un grafo mínimo preparado para cargar una imagen.

El script usa un directorio aislado en `/workspace/bellas-artes-lab`, escucha en
el puerto privado `18188` y no recibe tokens, contraseñas ni variables de
Bellas Artes. El panel genera un túnel SSH local; ComfyUI no se publica
directamente en Internet.

## Límites de la RTX 3090

La ventana automática suma 80 minutos dentro del laboratorio público.
Qwen-Image base y HunyuanVideo original quedan fuera de una
3090 porque el plan validado exige 48 GB o una cuantización todavía no probada.
Wan 2.2 y HunyuanVideo 1.5 son condicionales: descargar, mapear y generar video
puede consumir el resto de la sesión. Los modelos de voz, InsightFace y los
checkpoints de investigación permanecen bloqueados por licencia, consentimiento
o política.

## Diagnóstico rápido

Dentro de la instancia:

```bash
cat /workspace/bellas-artes-lab/status.json
tail -n 100 /workspace/bellas-artes-lab/bootstrap.log
tail -n 100 /workspace/bellas-artes-lab/comfyui.log
curl --fail http://127.0.0.1:18188/system_stats
```

Un estado distinto de `ready`, nodos rojos o un OOM significa detener ese caso,
anotar el error y continuar con el siguiente caso viable. No se deben pegar
tokens de Hugging Face, Vast, Supabase, Redis, R2 o Vercel en ComfyUI.
