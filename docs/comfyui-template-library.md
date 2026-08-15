# Biblioteca privada de templates ComfyUI

Snapshot: 14 de agosto de 2026.

## Fuentes importadas

| Repositorio | Estrellas | Licencia | Selección |
| --- | ---: | --- | ---: |
| [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates) | 790 | MIT | 16 |
| [kijai/ComfyUI-WanVideoWrapper](https://github.com/kijai/ComfyUI-WanVideoWrapper) | 6.665 | Apache-2.0 | 1 |
| [cubiq/ComfyUI_Workflows](https://github.com/cubiq/ComfyUI_Workflows) | 847 | Apache-2.0 | 3 |

Los veinte workflows se guardan bajo `workflows/templates/vendor/` y mantienen
el contenido funcional de las fuentes fijadas.
El panel `/admin/templates` permite descargarlos únicamente al operador y el
endpoint vuelve a calcular su SHA-256 antes de entregar el archivo.

## Plantillas incluidas

- FLUX.1 Schnell full T2I.
- FLUX.1 Dev full T2I, sólo investigación.
- SD3.5 simple, con adaptación de Large a Medium pendiente.
- FLUX.2 Klein 4B T2I.
- Qwen-Image T2I.
- Z-Image T2I.
- Wan 2.2 TI2V-5B nativo.
- HunyuanVideo 1.5 720p T2V e I2V.
- Real-ESRGAN GAN video upscale.
- Wan 2.2 ControlNet Depth del wrapper de Kijai.
- SDXL Base + Refiner para estudiar Juggernaut XL, DynaVision XL y WAI-ANI.
- DWPose guided composition de Cubiq.
- Estudio de upscale por modelo de Cubiq.
- FLUX.1 Schnell mínimo y SDXL simple oficiales.
- FLUX.2 Klein 4B y Qwen-Image para edición de imagen.
- Wan 2.2 5B Fun Control.
- FILM para interpolación de frames.

## Repositorios revisados y no importados

La búsqueda ampliada no se limitó a los tres repositorios vendorizados. GitHub
también muestra colecciones con más workflows, pero cada una tiene una razón
concreta para quedar como referencia administrativa:

- [ZHO-ZHO-ZHO/ComfyUI-Workflows-ZHO](https://github.com/ZHO-ZHO-ZHO/ComfyUI-Workflows-ZHO),
  7.735 estrellas y 17 JSON: GPL-3.0.
- [comfyanonymous/ComfyUI_examples](https://github.com/comfyanonymous/ComfyUI_examples),
  4.463 estrellas y 21 JSON: sin licencia redistribuible detectada por GitHub.
- [wyrde/wyrde-comfyui-workflows](https://github.com/wyrde/wyrde-comfyui-workflows),
  1.272 estrellas y 44 JSON: MIT, pero los ejemplos revisados usan SD1.5,
  LoRAs y upscalers ausentes del vault actual.
- [SeargeDP/SeargeSDXL](https://github.com/SeargeDP/SeargeSDXL), 874 estrellas y
  14 JSON: MIT, pero exige instalar su custom node completo.
- [masslevel/ComfyUI-Workflows](https://github.com/masslevel/ComfyUI-Workflows),
  CC0-1.0: workflows útiles, aunque usan custom nodes y Wan 2.1 14B.
- [Comfy-Org/example_workflows](https://github.com/Comfy-Org/example_workflows),
  20 JSON: ejemplos actuales, pero mezcla API nodes y no declara licencia.

- [kijai/ComfyUI-HunyuanVideoWrapper](https://github.com/kijai/ComfyUI-HunyuanVideoWrapper),
  2.595 estrellas: no declara licencia; no se redistribuye.
- [cubiq/ComfyUI_IPAdapter_plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus),
  6.096 estrellas: GPL-3.0, mantenimiento limitado y variantes FaceID que
  dependen de InsightFace. Se deja fuera del catálogo comercial privado.
- [XLabs-AI/x-flux-comfyui](https://github.com/XLabs-AI/x-flux-comfyui),
  1.703 estrellas: Apache-2.0, pero sus workflows dependen de custom nodes y
  ControlNets FLUX que no están instalados. Puede reevaluarse en otra onda.

## Seguridad operativa

Importar un JSON no significa que sea ejecutable. El catálogo separa
`importReady` de la preparación real del runtime. Ninguna plantilla inicia
Vast, descarga pesos, cambia billing o habilita generación pública.
