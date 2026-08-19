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

Flux Schnell es el único modelo con workflow API real
(`image/flux-schnell-v1`). La auditoría del 18 de agosto encontró que ese grafo
fue probado con un repack efímero distinto y que el paquete Diffusers local
quedó sin sus text encoders. Por tanto, hoy hay un workflow validado, pero cero
paquetes locales que cumplan simultáneamente artefactos, workflow y política.

La matriz canónica de los 22 paquetes está en
`infra/models/model-runtime-requirements.json`. Separa motor (`comfyui-api`,
`native-api`, componente o reemplazado), perfil de 16/24/48/80 GB, política y
artefactos mínimos. `npm run models:audit` contrasta esa matriz con ambos
vaults, los manifests y los grafos API. Un estado `installed` no basta.

Cinco paquetes quedaron correctamente reclasificados como `partial`: Flux
Schnell, SD3.5 Medium, FLUX.2 Klein 4B, HunyuanVideo 1.5 y LivePortrait. El
instalador ya corrige la causa: los patrones `/**/*` ahora también coinciden
con archivos ubicados directamente en la carpeta objetivo y el chequeo de
espacio descuenta los bytes existentes.

Los motores `native-api` ya disponen del transporte común documentado en
`docs/native-runtime-contract.md`: autenticación server-side, idempotencia,
health/modelos cargados, cola, polling, cancelación, base64 limitado y URLs de
salida con allowlist. Los servidores GPU de inferencia por modelo y sus smokes
siguen siendo un gate separado.

El estado de instalación `installed` sólo significa que el paquete fue
descargado y pasó la validación SHA-256 del vault. No implica que el modelo
esté habilitado para usuarios ni que su licencia permita hosting comercial.

## Olas de implementación

La matriz ejecutable vive en `src/lib/admin/model-test-plan.ts` y cubre los 22
paquetes sin convertir el catálogo en activación automática:

- `image-3090`: imagen abierta en una RTX 3090 de 24 GB, con presupuesto máximo
  de US$5 por ola.
- `image-large-vram`: Qwen-Image y otros modelos que requieren 48 GB o una
  cuantización validada.
- `control-and-postprocess`: DWPose, LivePortrait, Real-ESRGAN y RIFE; se
  validan dentro de un workflow padre.
- `audio`: RVC y F5-TTS en una cola aislada, con consentimiento y licencia.
- `video-large-vram`: Wan y Hunyuan en sesiones independientes de 48–80 GB.
- `research-policy`: pesos que sólo pueden estudiarse en laboratorio privado.
- `replaced`: dependencias que no deben ejecutarse.

La primera sesión sólo puede ejecutar entradas con `canRunAdminSmoke=true`.
Cada modelo aprobado necesita dos smoke tests y tres pruebas de aceptación,
además de output privado, coste, VRAM, tiempo, ownership y rollback. Un modelo
instalado o un template descargable no cambia por sí solo ese estado.

## Cómo activar un modelo para un smoke administrativo

1. Ejecutar `npm run models:audit` y no continuar si hay errores de catálogo o
   artefactos obligatorios ausentes.
2. Arrancar un único endpoint GPU Vast con el vault montado y la variante de
   pesos correspondiente. No copiar tokens al repositorio, a workflows ni a
   notas.
3. Exportar desde ComfyUI el grafo en formato API. El grafo debe coincidir con
   todos los bindings de `src/lib/generation/workflow-manifests.ts`.
4. Guardar el JSON versionado en `workflows/<modalidad>/` y registrarlo en
   `src/lib/generation/workflows.ts`, o pasarlo como override seguro
   `WORKFLOW_*` en el worker aislado.
5. Validar `isWorkflowConfigured()` y ejecutar un solo smoke con cuenta de
   operador, `GENERATION_ACCESS_MODE=admin`, `GENERATION_BILLING_MODE=shadow`,
   un worker y escala cero al terminar.
6. Registrar VRAM, tiempo, coste, output privado y resultado de licencia en
   Obsidian antes de considerar otra operación.

No se deben cambiar durante esa ventana `GENERATION_ENABLED` en el repositorio,
OAuth, créditos, billing, Redis, R2 ni MCP. La generación pública permanece
desactivada; el estado actual conserva `GENERATION_ENABLED=false` y
`WORKER_QUEUE_KINDS=image`.
