# Checklist de cierre operativo

Última revisión: 3 de septiembre de 2026.

Este documento separa las tareas que pueden ejecutarse desde el repositorio de
las que requieren acceso del propietario a servicios externos. La generación
debe permanecer cerrada hasta completar los gates de aceptación.

## Estado seguro actual

- `GENERATION_ENABLED=false`.
- `GENERATION_ACCESS_MODE=admin`.
- `GENERATION_BILLING_MODE=shadow`.
- Lint y 582 pruebas locales pasan en 102 archivos de prueba.
- La auditoría estricta de modelos permanece fallando de forma esperada:
  faltan workflows o runtimes reales para declarar un modelo listo.

## Trabajo del agente

El agente puede trabajar sin secretos ni gasto en GPU para:

1. Revisar y corregir código, contratos, validaciones y pruebas locales.
2. Verificar las migraciones y preparar comandos de comprobación no destructivos.
3. Ejecutar `npm run verify`, `npm run models:test` y las auditorías locales.
4. Preparar y revisar workflows API cuando el operador entregue exports reales.
5. Documentar resultados, bloqueos y evidencia sin guardar credenciales.

## Trabajo del propietario

### Publicación controlada

1. Revisar los cambios locales del repositorio consolidado antes de publicar.
2. Hacer push de la rama `codex/migracion-upstash-vps` con el token nuevo de
   Vercel y desplegar primero Preview.
3. Esperar la revisión técnica del deployment antes de promoverlo a Production.

No publicar la copia histórica `Documentos/bellas_artes` ni mezclar sus cambios
locales con la consolidación.

### Seguridad y accesos

1. Revocar y reemplazar las credenciales de Vercel, Google OAuth, R2 sandbox,
   Vast y Hugging Face que fueron expuestas o deben renovarse.
2. Mantener los nuevos valores sólo en sus consolas o archivos de entorno con
   permisos restringidos. No compartirlos en el chat.
3. Autenticar las CLIs de Supabase, Vercel, Vast y Hugging Face cuando se
   requieran acciones remotas.

### Supabase y cron

1. Confirmar que estas migraciones están aplicadas al proyecto objetivo. Si se
   cambia de proyecto, aplicarlas en este orden:

   - `202609010001_legal_consents.sql`
   - `202609010002_generation_audit_retention.sql`
   - `202609010003_audio_projects_atomic_save.sql`

2. Configurar `CRON_SECRET` en el entorno desplegado.
3. Ejecutar `npm run verify:preview` y una prueba E2E controlada de retención,
   usando sólo un bucket sandbox/preview/staging/test y autorizando escritura
   de forma explícita.
4. Informar únicamente el resultado de la prueba; no compartir secretos ni
   valores de variables.

### GPU y aceptación

1. Confirmar presupuesto, licencia y ventana de ejecución.
2. Asegurar saldo suficiente para Vast Serverless y verificar checkpoint,
   volumen y hash antes de encender el endpoint.
3. Entregar los exports API reales de los workflows como archivos del
   repositorio, sin incluir credenciales.
4. Ejecutar la aceptación admin-only de Flux Schnell con el arnés existente:
   dos smokes, tres aceptaciones como máximo, billing shadow y una sola GPU.
5. Registrar tiempos, coste, checksum, ownership, créditos y escala a cero.
6. Detener y destruir la instancia o endpoint al terminar, incluso si la prueba
   falla.

## Gates antes de beta

No activar usuarios invitados hasta verificar todos estos puntos:

- migraciones aplicadas y `verify:preview` correcto;
- OAuth y rutas privadas comprobados con una sesión real;
- cron observado en un entorno controlado;
- workflow y runtime GPU reales, con outputs privados en R2;
- reserva, captura, reembolso e idempotencia conciliados;
- moderación L2, auditoría y firma de procedencia configuradas;
- alertas, backups y conciliación de Vast probados;
- aceptación de los clientes MCP que se quieran soportar.

La copia histórica `/home/finvecito/Documentos/bellas_artes` queda fuera de
este checklist y no debe mezclarse con la consolidación sin revisar sus cambios
locales.

## Registro histórico: comprobación previa a la aplicación

El 2 de septiembre de 2026, antes de aplicar las migraciones, `npm run verify:preview` se detuvo sin mutar datos
porque Supabase no expone todavía `public.user_consents`. Esto confirma que las
migraciones legales, de retención y de guardado atómico aún no se han aplicado
en el proyecto remoto en ese momento. Este párrafo es histórico y no describe
el estado actual.

En la misma revisión, la auditoría del runtime encontró 22 manifests, 20
paquetes con artefactos mínimos, 1 workflow API completo, 13 adaptadores, 15
archivos de caché incompletos y 0 paquetes listos para código productivo.

## Verificación posterior a la aplicación

Las tres migraciones fueron aplicadas desde una máquina con conectividad al
Postgres remoto. La verificación posterior desde Bellas Artes pasó sin fallos:

- las tablas operativas, `user_consents` y `retention_expires_at` existen;
- `reserve_generation_credits` rechaza correctamente un usuario inexistente;
- la comprobación de retención es no destructiva y quedó disponible.

Una repetición local el 3 de septiembre no pudo alcanzar Supabase porque el
sandbox devolvió `fetch failed`; el comando no muta datos. La verificación
remota anterior sigue siendo la evidencia válida del esquema aplicado.

La generación permanece cerrada hasta completar los gates de GPU, workflow,
moderación y aceptación.
