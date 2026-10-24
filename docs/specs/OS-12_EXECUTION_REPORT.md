# OS-12 — Agente José Luis: entrega y activación controlada

Estado: identidad interna creada pero INACTIVA. No existe todavía un usuario Supabase Auth del dot.

## Implementado
- Tabla de agentes distinta de miembros humanos.
- José Luis registrado con `status=pending`, sin correo ni UID.
- Resumen seguro de 5 conteos, sin nombres, clientes, importes, información fiscal o financiera.
- La sesión del agente no hereda los permisos de Dirección.
- Pantalla /agente, diagnóstico separado y estado pendiente visible en /equipo.
- Flag global de solo lectura y escrituras de todos los módulos anteriores desactivadas.
- Prueba SQL reversible de acceso permitido solo con vinculación verificada, sin lectura de tablas comerciales.

## Activación posterior
1. Elegir una cuenta de correo o alias real, controlada por el propietario; el dot no recibe automáticamente correo independiente.
2. Crear el usuario de Supabase Auth a través del flujo compatible e introducir la confirmación en esa casilla real.
3. Vincular el UID de Auth a la identidad pending únicamente tras cotejar correo/UID, y cambiar el estado a active mediante un proceso administrativo validado.
4. Abrir ANDRAI OS desde la computadora de José Luis; el propietario toma el control del navegador para introducir contraseña y MFA de forma segura.
5. Devolver control al dot, verificar /diagnostico-acceso y /agente y comprobar denegación de /finanzas y otras rutas humanas.
6. Suspender el principal en caso de incidente y verificar la revocación.

## Limitaciones
- La cuenta de José Luis no está activa ni ha iniciado sesión.
- Vercel tiene protección de acceso adicional; la sesión del navegador del dot es independiente de la del propietario.
- Quedan pendientes GitHub privado, protección de contraseñas filtradas, respaldo/restauración y E2E reales.
- Ninguna propuesta, correo, pago, actualización ni acción de José Luis está autorizada en OS-12.
- No se ha hecho merge a main ni desplegado el portal en producción.
