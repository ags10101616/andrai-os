# OS-07 · Cotizaciones, versiones, aprobación y PDF

**Estado:** núcleo técnico implementado y probado en preview; escritura comercial OFF.
**Dependencias:** OS-02 Auth (E2E humano pendiente), OS-03 atomicidad, OS-04 sistema visual, OS-05 clientes, OS-06 proyectos opcionales.
**Repositorio:** ags10101616/andrai-os; branch feature/os-07, PR #7 en borrador.

## Modelo de negocio
Una cotización pertenece a una organización y a un cliente; opcionalmente a un proyecto del mismo cliente.
Se compone de hasta 24 conceptos (descripción, detalle, cantidad, precio unitario entero en centavos MXN).
El importe base, IVA y total se calculan en PostgreSQL, no se aceptan sumas desde el navegador.
IVA elegible 16 % (1600 basis points) o 0 % sujeto a valoración humana; **el módulo no sustituye asesoría fiscal ni emite CFDI**.
Precios expresados en MXN; el tipo de cambio, retenciones y descuentos no forman parte de V1.

## Máquina de estados
- draft -> review: Dirección o Comercial solicita revisión, almacena instantánea inmutable.
- review -> draft: solicitar correcciones, incrementa version conservando snapshot anterior.
- review -> approved: Dirección aprueba, firma interna de identidad verificada, registra fecha.
- approved -> sent: Dirección registra MANUALMENTE el envío; ninguna integración externa notifica.
- sent -> accepted/rejected: Dirección registra MANUALMENTE respuesta del cliente; NO equivale a firma electrónica.
- Documentos revisados/aprobados/enviados NO permiten cambiar conceptos; nuevo ciclo requiere una versión nueva antes de aprobar.
- \`revision\` es control optimista de concurrencia, \`version\` es versión comercial; no confundir.

## Acceso, seguridad y consistencia
1. Autenticación Supabase Auth SSR y rol servidor para cada acceso.
2. RLS de cotizaciones y snapshots permite solo Dirección y Comercial; Producción no lee ni escribe.
3. Dos migraciones incrementales: \`andrai_os_os07_quotes_lifecycle_v1\` y \`andrai_os_os07_quote_derived_subtotal_fix\`.
4. RPC de creación, edición y transición son SECURITY INVOKER y verifican el usuario confirmado, su organización y rol.
5. Trigger protegido SECURITY DEFINER en esquema no expuesto escribe únicamente snapshots de revisión y verifica actor.
6. Las instantáneas históricas son solo SELECT para miembros autorizados; UPDATE/DELETE/INSERT desde API se revocan.
7. IDs, vínculo organizacional y cliente son inmutables. Cálculo monetario int8 sin floats.
8. El registro de operaciones conserva el trigger de auditoría existente; no se registran datos de tarjetas.
9. PDF se genera en el servidor con los registros devueltos por RLS; rutas sin autenticación nunca exponen un PDF.
10. Descarga PDF \`Cache-Control: private, no-store\`, sin almacenamiento público o URLs de bucket.
11. \`OS07_QUOTES_WRITES_ENABLED\` está OFF en preview. No se añaden registros comerciales reales.

## Interfaz y PDF
- /cotizaciones: lista real, filtro por estados, cliente, total, versión, revisión, apertura de detalle.
- /cotizaciones/[id]: desglose, IVA, notas, vigencia, historial inmutable, acciones según rol y estado.
- Editor de líneas con importe entero, cantidad, detalle, notas y asociación opcional a un proyecto del mismo cliente.
- PDFs A4 multipágina, identidad Spectral Ember, totales y disclaimer comercial; muestra de QA sintética inspeccionada visualmente.

## Gate
Para declarar el spec completo, faltan:
- OS-02: autenticación humana real, negativos con Comercial/Producción y recuperación segura.
- Pruebas UI E2E autenticadas, concurrencia y flujo completo: formulario->RPC->historial->PDF con usuario real de ensayo.
- Revisión legal/fiscal del tratamiento de IVA y condiciones por cotización.
- Rate limiting / prevención de abusos y comprobación de navegación por teclado y dispositivos.
- Aprobación de privacidad del repo (temporalmente público) y PR #7.
- Ningún merge a main ni promoción de OS-07 a producción antes de esos gates.
