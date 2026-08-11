# SQL histórico de consolidación

Estos archivos preservan borradores manuales anteriores a la secuencia
canónica de `supabase/migrations/`. No se aplican con Supabase CLI y no son la
fuente de verdad del esquema remoto.

- `migration_0006_only.sql` conserva la versión previa que admitía RunPod.
  La migración canónica `202608080008_vast_only_generation.sql` bloquea nuevas
  reservas fuera de `vast` y `fake`.
- `preview_setup.sql` conserva el bootstrap manual usado durante Preview.

Para cambios futuros se debe crear una migración aditiva nueva dentro de
`supabase/migrations/`.
