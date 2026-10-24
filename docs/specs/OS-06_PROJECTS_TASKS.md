# OS-06 · Proyectos, Tareas, Entregables y Responsables
Estado: Núcleo SQL probado; Next.js preview con lectura real y escrituras desactivadas. Revisión humana y E2E pendientes.

## Objetivo
Unificar proyectos, entregables e hitos con cliente, responsable, progreso, fecha y tareas, sin operaciones inconsistentes ni modificaciones fuera de autorización.

## Modelo
- \`os_projects\`: proyecto vinculado a cliente, responsable, etapa \`brief → design → development → review → delivered\`, progreso 0–100, fecha y \`revision\`.
- \`os_tasks\`: tarea / entregable / hito, prioridad, responsable, fecha, referencia opcional a proyecto u oportunidad, estado terminado, fecha de cierre controlada por BD y \`revision\`.
- Estados y prioridades están restringidos por CHECK.
- Auditoría y RLS existentes continúan activos.

## Operaciones transaccionales (RPC, SECURITY INVOKER)
- \`os06_create_project_v1\`: solo Dirección; no acepta tenant ni permisos del cliente; UUID estable para reintentos, mismo contenido devuelve \`created=false\`, colisión distinta \`23505\`.
- \`os06_set_project_stage_v1\`: Dirección o Producción asignada, revisión esperada, avance de una etapa por transición. \`delivered\` requiere 100%; volver de entregado solo Dirección.
- \`os06_create_task_v1\`: todos los roles para tarea propia; Dirección puede asignar a otros; Comercial vincula oportunidades, Producción vincula proyectos. Una tarea solo se vincula a uno de ambos.
- \`os06_set_task_done_v1\`: Dirección o responsable asignado; versión esperada y ejecución repetida idempotente. La base genera \`completed_at\`.

## Seguridad
- Todo se vincula a \`auth.uid()\` y membresía \`os_staff\` confirmada; no service_role.
- Las funciones son \`SECURITY INVOKER\`, EXECUTE solo authenticated y tablas protegidas por RLS.
- UPDATE directo solo permite campos estrechos (etapa/progreso/revision o done/revision); triggers bloquean saltos de etapa, fechas falsas, revisiones inconsistentes.
- Inmutabilidad de id, organización y fecha creada proviene de OS-03.
- Formulario Next no escribe salvo bandera del servidor \`OS06_OPERATIONS_WRITES_ENABLED=true\`. En la preview de OS-06 está explícitamente \`false\`.
- El repositorio de GitHub sigue público temporalmente por decisión del propietario: no se cargaron secretos, clientes o información de equipo.

## UX
- \`/proyectos\`: filtro por etapa, cliente, avance, responsable, vencimiento, progreso de tareas y entregables pendientes; creación solo Dirección.
- \`/tareas\`: filtros pendientes/terminadas/todas, vínculo por proyecto, tipo, prioridad, fechas, responsable, creación y cierre/reapertura.
- IDs estables en sesión del navegador para reintentos sin duplicación; estados de error, actualización y bloqueo visible.
- Sin datos inventados ni acciones autónomas de José Luis.

## Pruebas realizadas
- PostgreSQL con transacciones \`ROLLBACK\`: alta e idempotencia de proyecto/tarea; colisiones; etapas; versión obsoleta; timestamp de cierre; reabrir; auditoría.
- Simulación de Dirección, Comercial y Producción: Comercial crea tarea propia, no modifica proyectos; Producción crea entregable ligado y cambia etapa del proyecto asignado, no crea proyectos.
- Simulación de otra organización: referencias a sus clientes y proyectos rechazadas.
- Direct UPDATE de campos fuera de privilegio denegado; intentos de saltar etapas rechazados incluso por API.
- CI valida Node tests, lint, tipos, build, npm audit; inspeccionar reporte técnico de ejecución.

## Gates pendientes
1. OS-02: ingreso real del propietario y pruebas E2E autenticadas, roles adicionales reales.
2. OS-06: habilitar escrituras en ambiente aislado y verificar el flujo de formulario → RPC → consulta → auditoría sin necesidad de claves administrativas.
3. Pruebas de UI móvil/accesibilidad en navegador autenticado, estados de red, CSRF/rate-limits y reintentos de formularios.
4. Revisión de PRIVACIDAD del repo y aprobación de PR.
5. No fusionar ni promover la rama a producción antes de los gates.

Siguiente spec del roadmap: OS-07 Cotizaciones, sin mezclar con finanzas ni escrituras de José Luis.
