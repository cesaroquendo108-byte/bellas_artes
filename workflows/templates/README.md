# Plantillas ComfyUI privadas

Esta carpeta contiene 20 workflows de interfaz (`Save` / `Export`) para abrirlos
manualmente en ComfyUI. No son los grafos API ejecutables del worker de Bellas
Artes y no se registran en `src/lib/generation/workflows.ts`.

Las copias bajo `vendor/` conservan el JSON original, el commit fijado y la
licencia del repositorio de origen. El catálogo privado de Bellas Artes muestra
si cada plantilla:

- coincide con los modelos instalados;
- necesita mapear nombres o convertir el paquete Diffusers a formato ComfyUI;
- requiere custom nodes o pesos adicionales;
- está restringida a investigación administrativa.

Importar una plantilla no descarga pesos, no crea endpoints GPU y no habilita
generación pública. Antes de un smoke se debe comprobar el nombre exacto de
cada archivo, los nodos requeridos, la VRAM, la licencia y el presupuesto.

## Fuentes fijadas

- `Comfy-Org/workflow_templates` — commit
  `d9e66019b85da231b7c936ad9cb7ff08cec16557`, licencia MIT.
- `kijai/ComfyUI-WanVideoWrapper` — commit
  `088128b224242e110d3906c6750e9a3a348a659b`, licencia Apache-2.0.
- `cubiq/ComfyUI_Workflows` — commit
  `038cb775f2e8eb54bdbc99a8b9720177c7f8a336`, licencia Apache-2.0.

Las estrellas registradas en el catálogo son un snapshot del 14 de agosto de
2026; no se consultan dinámicamente ni se usan como garantía de seguridad.
