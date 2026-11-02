# Bellas Artes

SaaS creativo para crear y organizar imagen, video, audio, personajes y
mundos. La aplicación web corre en Next.js; Supabase maneja autenticación y
persistencia; Cloudflare R2 almacena los archivos privados; Redis/BullMQ y
Vast.ai son infraestructura opcional para la generación asíncrona.

## Arranque local

Requisitos: Node.js 24, npm y un archivo `.env.local` con las credenciales del
entorno correspondiente. Las variables están documentadas en `.env.example`.

```bash
npm ci
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`. El arranque no
activa generación por sí solo: el estado seguro por defecto mantiene
`GENERATION_ENABLED=false`, billing en `shadow` y acceso administrativo.

## Verificación

```bash
npm run verify
npm run models:test
npm run models:audit:markdown
```

`npm run verify` ejecuta lint, pruebas, build Webpack y el escaneo de secretos.
La auditoría estricta de modelos (`npm run models:audit`) debe permanecer
fallando mientras falten workflows, pesos o runtimes compatibles; eso evita
presentar módulos incompletos como operativos.

## Arquitectura operativa

- Vercel sirve la aplicación y las rutas API.
- Supabase aplica las migraciones de `supabase/migrations/` y conserva RLS,
  créditos, jobs, consentimiento legal y auditoría.
- R2 es privado; la aplicación sólo entrega URLs firmadas y temporales.
- El worker externo consume BullMQ y persiste resultados mediante el rol de
  servicio. No se ejecuta dentro de Vercel.
- El stack de Redis privado y su gateway HMAC están en
  [`infra/redis-vps/`](infra/redis-vps/README.md).
- Vast.ai Serverless es el único proveedor GPU aceptado. La generación real
  permanece cerrada hasta validar runtimes, workflows y una aceptación
  controlada.

## Despliegue y cierre

Antes de declarar el entorno operativo:

1. Confirmar que las migraciones requeridas están aplicadas en el proyecto
   Supabase objetivo; si se trata de otro proyecto, aplicar las pendientes en
   orden.
2. Configurar en Vercel sólo las variables propias de la aplicación; Redis y
   las credenciales del worker permanecen fuera de Vercel salvo el gateway
   HTTPS y su HMAC.
3. Construir `Dockerfile.worker` y desplegarlo en un host persistente con un
   archivo de entorno fuera del repositorio.
4. Validar el gateway, el healthcheck del worker, R2 privado y el verificador
   de Preview antes de activar cualquier modalidad.

Runbooks detallados:

- [`docs/operational-closure-checklist.md`](docs/operational-closure-checklist.md)
- [`docs/worker-deployment.md`](docs/worker-deployment.md)
- [`infra/vast/README.md`](infra/vast/README.md)
- [`workflows/README.md`](workflows/README.md)
- [`docs/migration_audit.md`](docs/migration_audit.md)

Las claves existentes no se imprimen, se escanean ni se reemplazan por este
proyecto. Los comandos E2E que escriben datos o consumen servicios externos
requieren una autorización explícita mediante sus flags de entorno.
