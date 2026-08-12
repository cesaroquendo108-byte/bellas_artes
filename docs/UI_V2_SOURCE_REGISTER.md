# Bellas Artes UI v2 — Registro de fuentes visuales

Este registro identifica las fuentes usadas como referencia o código adaptado.
No se cargan scripts remotos de estas páginas en producción.

| Fuente | Uso en Bellas Artes | Tratamiento | Licencia / control |
|---|---|---|---|
| Aceternity UI | Spotlight, hero y superficies públicas | Adaptación local, sólo efectos seleccionados | Revisar licencia del componente antes de usar recursos premium |
| React Bits | Reveal, hover y estados visuales | Código adaptado a `framer-motion` existente | MIT + Commons Clause; conservar aviso y revisar el componente |
| Motion Primitives | Referencia de física y transiciones | Adaptación local, sin runtime adicional | MIT |
| Shadcn Studio | Dashboard, settings y bloques de aplicación | Código copiado/adaptado, no dependencia runtime | Revisar licencia de cada bloque, especialmente Pro |
| 21st.dev | Composición de bloques y patrones | Referencia y adaptación local | Revisar licencia del snippet elegido |
| NumberFlow | Créditos y métricas | Dependencia explícita `@number-flow/react` | MIT |
| Component Gallery | Auditoría de patrones UX | Referencia visual, no código de producción | No aplica |
| Watermelon | Inspiración de sistema visual | Referencia, no dependencia | Revisar fuente específica si se incorpora código |
| Alacena (archivo local del usuario) | Claridad del workspace, canvas cálido, tarjetas, navegación inferior y jerarquía móvil | Referencia visual; no se importó código, marca, copy, assets, variables de entorno ni runtime | Material local aportado por el propietario del proyecto |
| Proyecto Arocha Redesign (archivo local del usuario) | Densidad del backoffice, sidebar, KPIs, tablas y estados operativos | Referencia visual; no se importó código, marca, datos, PocketBase ni secretos | Material local aportado por el propietario del proyecto |

## Reglas

- No importar URLs, trackers ni scripts de terceros.
- No copiar branding, copy o assets de OpenArt.
- Registrar cambios relevantes en la bitácora de Obsidian.
- Preferir código local copiable sobre dependencias grandes.
- Ejecutar `npm run security:secrets` después de añadir componentes.
- Mantener la landing pública y el backoffice en lenguaje oscuro; el workspace
  autenticado usa la paleta cálida Bellas Artes inspirada en Alacena.
- Los archivos de referencia nunca se incorporan al bundle de producción.
