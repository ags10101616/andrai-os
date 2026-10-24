# OS-07 · Reporte de implementación y evidencias

**Fecha:** 24 de octubre de 2026
**PR de revisión:** https://github.com/ags10101616/andrai-os/pull/7
**Rama:** feature/os-07
**Preview protegida:** https://andrai-os-git-feature-os-07-ags10101616s-projects.vercel.app

## Lo que existe realmente
- Cotizaciones con una máquina de estados y aprobación por rol.
- Snapshot inmutable al entrar a revisión, con posibilidad de crear nueva versión tras devolución.
- Totales y cuota fiscal calculados por trigger, no aceptados de la interfaz.
- Editor de conceptos, listado, detalle, PDF A4 y evidencia automática de PDF de prueba.
- Rama Vercel con \`OS07_QUOTES_WRITES_ENABLED=false\`; no se activa hasta E2E con propietario.
- Secretos y datos comerciales no incorporados al repositorio GitHub temporalmente público.

## Evidencias de integración
- Suite SQL con transacción ROLLBACK \`tests/postgres/os07_quotes.rollback.sql\`:
  - primer alta, repetición sin duplicados y conflicto de datos,
  - subtotal 1,300,000 centavos + IVA 208,000 = 1,508,000,
  - edición v1 con control optimista, snapshot, devolución a draft v2,
  - segunda revisión, aprobación owner, registro manual de envío y aceptación,
  - snapshots conservados, rechazo de ediciones tras aprobación,
  - identidad no autorizada no puede crear registros.
  - Resultado: PASS; cambios revertidos.
- Simulaciones independientes de rol (ROLLBACK):
  - Comercial crea y solicita revisión; no puede aprobar;
  - Producción no crea cotizaciones;
  - Dirección autoriza aprobación.
  - Resultado: PASS.
- Negativos cross-tenant, cantidad inválida, IVA inválido, aprobación anticipada, edición simultánea y RLS:
  - Resultado: PASS; todas las transacciones revertidas.
- CI \`npm ci\`, lint, typecheck, tests Node, \`next build\`, \`npm audit\`.
- Prueba PDF real con \`pdf-lib\`: \`PDFDocument.load\` valida A4; 24 conceptos paginan, imagen revisada.
- Vercel Preview protegido con autenticación.

## Historial de correcciones
- La primera ejecución SQL detectó un INSERT en \`amount_minor\` sin permiso; se corrigió haciendo que el trigger lo derive.
- Un árbol Git intermedio omitió archivos de OS-07; se recuperaron y se verificó el build en el commit final.
- Se fijó dependencia \`pdf-lib@1.17.1\` con package-lock.json y CI reproducible.

## Pendientes importantes
- Inicio de sesión real de propietario y prueba de acceso del equipo.
- Acciones de escritura y flujo PDF desde usuario real no probados: flag OFF.
- Correo de envío, CFDI, firma electrónica y registro financiero no están implementados.
- Se mantiene alerta Supabase de protección contra contraseñas filtradas desactivada.
- Repo sigue visible PUBLIC por decisión temporal de propietario; ninguna PII o secreto se registró en Git.
- El PR está en borrador y no está fusionado a main.

**Veredicto:** Núcleo SQL y frontend/PDF técnicamente verificados, NO equivale a lanzamiento operativo.
