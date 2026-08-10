# Vast.ai Serverless

`provision_flux_schnell.sh` instala el checkpoint público Flux Schnell FP8 en
un volumen montado en `/workspace/ComfyUI/models/checkpoints`. La descarga está
fijada a un commit de Hugging Face y se valida por tamaño y SHA-256 antes de
publicar el archivo final.

El endpoint no recibe credenciales de Supabase ni R2. El wrapper oficial
devuelve el resultado inline y el worker CPU de Bellas Artes lo persiste en R2.

Guardas obligatorias del endpoint: `min_load=0`, `cold_workers=0`,
`max_workers=1`, `inactivity_timeout=600`.
