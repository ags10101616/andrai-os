# OS-03 · Integridad de datos y operaciones transaccionales

**Estado:** implementación en feature branch, sujeta a verificación.  
**Prerequisito:** OS-02 Auth & RLS; primer login humano sigue pendiente.  
**Alcance limitado:** la primera transacción real es **Cliente + Oportunidad**, sin activar todavía una pantalla comercial.

## Objetivo
Evitar clientes huérfanos, duplicados causados por reintentos y cruces de datos entre organizaciones. Preservar la identidad de los registros, registrar auditoría y mostrar errores claros a los próximos módulos.

## Entrega
- Función PostgreSQL \`public.os_create_lead_v1\`, SECURITY INVOKER, EXECUTE solo authenticated.
- Organización y miembro responsable derivados del usuario Auth verificado, **nunca** proporcionados por la petición.
- Alta atómica cliente + oportunidad dentro de una única transacción de PostgreSQL.
- Idempotencia mediante dos UUID generados por la aplicación; los mismos identificadores se reenvían al reintentar.
- Un UUID reutilizado con datos distintos produce error de conflicto; no se sobreescribe el registro.
- Inmutabilidad de \`id\`, \`organization_id\` y \`created_at\` en clientes, oportunidades, proyectos, tareas y cotizaciones.
- Índice dirigido a búsquedas de oportunidades por cliente.
- Pruebas de RLS, duplicidad, escritura inválida, auditoría y rollback, sin registros duraderos de prueba.

## No incluido
- Interfaz de alta: OS-05.
- Crear oportunidades para clientes ya existentes: OS-05.
- Estados, versionado y aprobación de cotizaciones: OS-07.
- Contabilidad y movimientos financieros: OS-08.
- Cuenta o permisos de José Luis: OS-12/13.
- Corrección final del catálogo de roles e invitaciones: OS-02 permanece en revisión humana.

## Invariantes de seguridad
1. Sin sesión, sin acceso.
2. Solo owner y sales pueden ejecutar altas.
3. La función es invoker: RLS sigue evaluándose sobre las dos tablas.
4. El rol y tenant se derivan exclusivamente de \`auth.uid()\` + membresía \`os_staff\` verificada.
5. Nada se escribe en \`os_staff\`, \`auth.users\` o \`os_ledger\`.
6. El resultado no revela filas ajenas ni contenido de clientes.
7. No usar service_role ni insertar tokens/PII en un repositorio público.
8. No incorporar cambios a \`main\` hasta verificación y revisión humana.

## Plan de prueba
- Positiva: usuario owner de prueba validado crea ambas filas en la misma transacción.
- Repetición con los mismos IDs => \`created=false\`, exactamente 1 cliente y 1 oportunidad.
- Repetición con otro título => \`23505\`, contenido original intacto.
- ID perteneciente a otra organización => no cruza RLS.
- Usuario sin membresía => \`42501\`; ninguna fila nueva.
- Datos inválidos => \`22023\`; ninguna fila nueva.
- UPDATE de ID/organización/fecha original => \`42501\`.
- Auditoría contiene INSERT de ambas tablas.
- Tras ROLLBACK de la prueba, tablas comerciales siguen vacías.
- GitHub CI y npm audit pasan, Vercel preview READY y sin secretos.

## Gate
Se permite cerrar el **núcleo de integridad de OS-03** cuando SQL, tests y revisión de seguridad pasen. El spec total continúa pendiente mientras no exista E2E real desde la aplicación firmado por un usuario humano.
