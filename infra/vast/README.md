# Vast.ai Serverless

`provision_flux_schnell.sh` instala el checkpoint público Flux Schnell FP8 en
un volumen montado en `/workspace/ComfyUI/models/checkpoints`. La descarga está
fijada a un commit de Hugging Face y se valida por tamaño y SHA-256 antes de
publicar el archivo final.

El endpoint no recibe credenciales de Supabase ni R2. El wrapper oficial
devuelve el resultado inline y el worker CPU de Bellas Artes lo persiste en R2.

Guardas obligatorias del endpoint: `min_load=0`, `cold_workers=0`,
`max_workers=1`, `inactivity_timeout=600`.

Antes de descargar el checkpoint, el provisionador exige que el directorio de
modelos esté en un filesystem dedicado. Si `/workspace` cae en `/`, `overlay` o
`overlayfs`, termina con `CACHE_VOLUME_NOT_MOUNTED` y no inicia la descarga.

`acceptance.env.example` contiene únicamente los overrides no secretos de la
ventana de cinco jobs, incluido el máximo estimado de US$0.20 por job. No debe cargarse mientras falten rotaciones, auditoría o
la comprobación del checkpoint, y `GENERATION_ENABLED` vuelve a `false` al
finalizar incluso si la aceptación falla.

## Laboratorio administrativo RTX 3090

`bootstrap_3090_lab.sh` prepara en una instancia efímera un ComfyUI fijado por
commit, los pesos públicos de Flux Schnell, Klein 4B, Z-Image, SDXL Base/Refiner y
Real-ESRGAN, y los workflows privados necesarios para probarlos. La fuente de
workflows se fija por `BA_REPO_REF` y el cliente administrativo comprueba el
SHA-256 del bootstrap antes de ejecutarlo.

El perfil usa 100 GB de disco, ComfyUI escucha sólo en el puerto interno `18188`
y el panel ofrece un túnel SSH hacia `localhost:8188`. No se descargan modelos
gated, custom nodes GPL, pesos de voz ni modelos de investigación. El proceso
completo y los límites de una RTX 3090 están en
[`docs/gpu-lab-3090-runbook.md`](../../docs/gpu-lab-3090-runbook.md).
