# Integración privada del Model Vault

La aplicación reconoce los 22 paquetes instalados en:

- `/mnt/cesar/BellasArtes_ModelVault` — vault principal.
- `/mnt/disco_500gb/BellasArtes_ModelVault` — vault secundario para HunyuanVideo.

El catálogo técnico es `src/lib/generation/model-runtime-catalog.ts`. El panel
privado `/admin/models` lo cruza con `infra/models/model-install-state.json` y
muestra cuatro estados importantes:

- `workflow_ready`: existe un grafo API real y validado.
- `workflow_pending`: el modelo está instalado y tiene contrato de bindings,
  pero aún falta exportar/validar el grafo ComfyUI.
- `component_pending`: es un auxiliar de pose o postproceso que se consume
  desde otro pipeline, no un generador autónomo.
- `research_only` / `replaced`: queda aislado por licencia, consentimiento,
  moderación o reemplazo técnico.

## Estado actual

Flux Schnell es el único modelo con workflow real (`image/flux-schnell-v1`). El
resto ya tiene backend, ruta y manifiesto contractual en Bellas Artes, pero no
se puede considerar ejecutable hasta que exista un workflow API real y se
valide contra los pesos instalados.

El estado de instalación `installed` sólo significa que el paquete fue
descargado y pasó la validación SHA-256 del vault. No implica que el modelo
esté habilitado para usuarios ni que su licencia permita hosting comercial.

## Cómo activar un modelo para un smoke administrativo

1. Arrancar un único endpoint GPU Vast con el vault montado y la variante de
   pesos correspondiente. No copiar tokens al repositorio, a workflows ni a
   notas.
2. Exportar desde ComfyUI el grafo en formato API. El grafo debe coincidir con
   todos los bindings de `src/lib/generation/workflow-manifests.ts`.
3. Guardar el JSON versionado en `workflows/<modalidad>/` y registrarlo en
   `src/lib/generation/workflows.ts`, o pasarlo como override seguro
   `WORKFLOW_*` en el worker aislado.
4. Validar `isWorkflowConfigured()` y ejecutar un solo smoke con cuenta de
   operador, `GENERATION_ACCESS_MODE=admin`, `GENERATION_BILLING_MODE=shadow`,
   un worker y escala cero al terminar.
5. Registrar VRAM, tiempo, coste, output privado y resultado de licencia en
   Obsidian antes de considerar otra operación.

No se deben cambiar durante esa ventana `GENERATION_ENABLED` en el repositorio,
OAuth, créditos, billing, Redis, R2 ni MCP. La generación pública permanece
desactivada; el estado actual conserva `GENERATION_ENABLED=false` y
`WORKER_QUEUE_KINDS=image`.
