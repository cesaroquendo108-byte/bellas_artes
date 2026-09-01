# Documento de Auditoría de Migraciones de Base de Datos

## 1. Resumen Ejecutivo
Este documento detalla la auditoría de la secuencia de migraciones SQL del proyecto Bellas Artes en Supabase, verificando la integridad del esquema, el orden numérico de aplicación y justificando la estructura actual de versiones.

---

## 2. Inventario de Migraciones en `supabase/migrations/`

| Archivo | Fase / Componente | Descripción General |
|---|---|---|
| `202608080000_base_schema.sql` | Esquema Base (Baseline) | Tablas fundamentales `public.users` (con referencia a `auth.users`) y `public.transactions`. Función y trigger `public.handle_new_user()` en `auth.users`. |
| `202608080001_phase1_stabilization.sql` | Fase 1 - Estabilización | Adición de `wallets`, `pago_movil_proofs`, `generated_assets`, funciones transaccionales de créditos/pagos, restricciones de integridad y políticas RLS. |
| `202608080002_story_director_projects.sql` | Fase 2 - Story Director | Tabla `creative_projects`, validaciones de escenas/portadas, visibilidad comunitaria y políticas RLS. |
| `202608080003_social_brand_kits.sql` | Fase 3 - Social Brand Kits | Tablas `brand_kits` y `community_posts`, validación de assets vinculados, moderación y políticas RLS. |
| `202608080005_phase5_audio_suite.sql` | Fase 5 - Audio Suite | Tablas `audio_voices`, `audio_jobs`, `audio_projects`, `audio_tracks`, RPCs transaccionales de créditos de audio para `service_role` y RLS. |
| `202608080006_generation_orchestration.sql` | Orquestación de generación | Jobs, intentos, eventos, vínculos de assets y RPCs idempotentes de reserva, reembolso y finalización. |
| `202608080007_generation_controls.sql` | Controles de generación | Pausa operativa, límites y controles de seguridad de la generación. |
| `202608080008_vast_only_generation.sql` | Proveedor Vast.ai | Restricción de rutas de generación a Vast.ai y fake de pruebas, sin borrar historial. |
| `202608080009_generation_telemetry.sql` | Telemetría | Timings, métricas de proveedor y coste estimado por intento. |
| `202608100010_generation_billing_shadow.sql` | Billing shadow | Metadatos de billing shadow y coste real de ejecución. |
| `20260810075311_generation_rollout_access.sql` | Acceso gradual | Grants de acceso por nivel y allowlist server-side. |
| `20260812120000_admin_dashboard_v1.sql` | Dashboard administrativo | Auditoría administrativa, heartbeats y RPCs de operación. |
| `20260812170000_admin_users_access.sql` | Usuarios y acceso | Roles, grants administrativos y auditoría de cambios. |
| `20260813150000_vast_admin_gpu_leases.sql` | Leasing Vast.ai | Solicitudes, alquileres, heartbeats y auditoría del ciclo de vida GPU. |
| `202609010001_legal_consents.sql` | Consentimiento legal | Consentimientos versionados de términos y moderación, con RLS cerrado. |
| `202609010002_generation_audit_retention.sql` | Retención de auditoría | Vencimiento de 180 días y poda server-side de eventos de moderación. |
| `202609010003_audio_projects_atomic_save.sql` | Integridad Audio Suite | RPC transaccional para guardar metadata y pistas de proyectos de audio. |

---

## 3. Justificación de la Brecha Numérica (Gap entre `0003` y `0005`)

En la secuencia de archivos de migración se observa un salto directo del prefijo `0003` al `0005`, omitiendo el prefijo `0004`:

1. **Ausencia de cambios DDL en Fase 4**: La Fase 4 del proyecto se centró en lógica de aplicación, integraciones de frontend y flujos de trabajo que no requirieron modificaciones DDL (Data Definition Language) ni la creación de nuevas tablas o triggers en PostgreSQL.
2. **Asignación del Prefijo `0005`**: Al iniciar la Fase 5 (Audio Suite), se utilizó la numeración `202608080005_phase5_audio_suite.sql` para mantener correspondencia directa con la numeración de la Fase 5.
3. **Imposibilidad de Renombrado de Archivos**: Los archivos de migración existentes **no deben ser renombrados** a fin de preservar:
   - La compatibilidad con las pruebas unitarias e integrales que leen archivos específicos de migración mediante rutas fijas (p. ej., `src/lib/story/migration.test.ts`, `src/lib/social/migration.test.ts`, `src/lib/audio/migration.test.ts`).
   - El historial de seguimiento de migraciones en entornos de desarrollo y producción de Supabase (`supabase_migrations.schema_migrations`).

---

## 4. Verificación de Integridad y Continuidad del Esquema

- **Dependencias Transaccionales**: `202608080000_base_schema.sql` establece las tablas base requeridas por `202608080001_phase1_stabilization.sql` (modificación de `users` y `transactions`, adición de `wallets`).
- **Seguridad y RLS**: Todas las tablas posteriores habilitan `ROW LEVEL SECURITY` y restringen accesos por `user_id` o permisos de rol (`service_role`).
- **Compatibilidad**: Todas las operaciones son aditivas y mantienen compatibilidad con versiones previas de la aplicación.
