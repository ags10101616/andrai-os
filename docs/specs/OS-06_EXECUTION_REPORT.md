# OS-06 · Informe de ejecución

**Fecha:** 24 octubre 2026. **Branch:** \`feature/os-06\`. **PR:** https://github.com/ags10101616/andrai-os/pull/6

## Cambios remotos
- GitHub: dos módulos Next.js dinámicos, formularios, tipos, validaciones, operaciones de backend, CSS, tests y spec.
- Vercel: despliegues en Preview protegida por SSO, env públicas aisladas de la rama.
- Supabase proyecto ANDRAI OS: dos migraciones:
  1. \`andrai_os_os06_projects_tasks_workflow_v1\`.
  2. \`andrai_os_os06_harden_stage_and_completion_v1\`.
- No cambios en ANDRAI marketing, ZONERA, 5TAR HOST ni proyectos de clientes.

## Evidencia SQL real
**Prueba owner, todo ROLLBACK:** Crear proyecto y tarea, replay exacto sin duplicación, conflicto al cambiar contenido, prohibir salto de estado, avance controlado de revisión, terminar/reabrir tarea, generación de completed_at y auditoría. PASS.

**Prueba por roles, todo ROLLBACK:** Comercial crea tarea propia pero no proyecto ni tarea de producción; Producción crea entregable del proyecto asignado y cambia etapa, pero no crea proyectos. PASS.

**Prueba de tenant distinto, todo ROLLBACK:** Director de una organización no puede vincular cliente ni proyecto de otra. PASS.

**Hardening, todo ROLLBACK:** UPDATE directo \`brief→delivered\` rechazado; timestamp de cierre no falsificable por usuario; \`completed_at\` se genera mediante trigger y se borra al reabrir. PASS.

## Código, CI y despliegue
- GitHub Actions PASS en https://github.com/ags10101616/andrai-os/actions/runs/40121863122 (último commit SQL al momento de revisión).
- CI incluyó npm ci, ESLint, TS, tests, Next build y npm audit.
- Preview protegida en https://andrai-os-git-feature-os-06-ags10101616s-projects.vercel.app
- Writes de UI: \`OS06_OPERATIONS_WRITES_ENABLED=false\`, revisión aún pendiente.

## Advertencia existente
Supabase \`auth_leaked_password_protection\` sigue desactivado; ver https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Veredicto
**Núcleo técnico OS-06 = PASS.** No equivale a terminar OS-06 para operación real: faltan el login humano de OS-02, E2E reales y revisión de UI, privacidad y lanzamiento. Todos los PR continúan en borrador y no hay datos comerciales persistentes generados.
