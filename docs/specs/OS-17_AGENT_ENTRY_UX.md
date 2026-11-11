# OS-17 · Acceso de un toque para José Luis (sin eliminar autenticación)

## Objetivo
Facilitar el acceso cotidiano desde un navegador que **ya conserva una sesión válida**, sin abrir ANDRAI OS al público ni duplicar la identidad de José Luis.

## Implementación
- URL cómoda de entrada: `/entrada` (y `/`). Comprueba en el servidor la sesión de Supabase y redirige a `/resumen` para un miembro staff, o `/agente` para la identidad propia de José Luis.
- `/login` omite el formulario si esa cuenta ya tiene un acceso válido; al iniciar sesión con contraseña, la redirección usa el mismo selector.
- Una cuenta válida pero sin membresía ni identidad de agente termina en `/acceso-restringido`; una sesión ausente termina en `/login`.
- Ninguna modificación de tablas, RLS, credenciales, funciones RPC, permisos `brief_read`, políticas de alta, escrituras ni flags globales.
- El Proxy de Next.js ahora renueva cookies de Supabase antes de renderizar `/`, `/entrada`, `/login`, `/diagnostico-acceso`, `/acceso-restringido` y `/restablecer-contrasena`, además de las rutas de workspace. No bloquea ni redirige estas páginas públicas por carecer de sesión; solo las rutas protegidas exigen credenciales en el Proxy.
- Si una comprobación en una ruta protegida invalida cookies, la redirección conserva las cookies de limpieza. Se establece `Cache-Control: private, no-store` en las respuestas revisadas.

## Configuración necesaria fuera del código
1. Usar un perfil de navegador separado para José Luis; iniciar sesión con su identidad **existente** una sola vez, sin compartir la cuenta de Dirección.
2. Guardar `https://<deployment-autorizado>/entrada` como favorito dentro de ese perfil. La sesión permanecerá activa solo mientras el proveedor y las políticas de cookies lo permitan; si expira, solicitará login.
3. La preview OS-16 tiene protección de Vercel adicional a Supabase: **un acceso directo no supera Vercel Authentication**. Habilitar acceso de pruebas al agente requiere un mecanismo autorizado distinto y evaluación de seguridad. No compartir bypass tokens ni hacer pública la app para solucionar esto.
4. La recuperación de contraseña y su URL/callback en Supabase deben verificarse en el entorno real, como ya consta en OS-12; este cambio no las declara probadas.

## Acceso mediante herramientas del agente
No está implementado en esta PR: requiere decidir un conector tipado seguro y un método de autenticación de servicio/usuario con tokens acotados y revocables, con RLS intacto, auditoría y pruebas end-to-end. No habilitar service_role ni autoejecución.

## Verificación de release (PENDIENTE hasta probar)
- `npm run quality` / CI del commit exacto (pruebas de `shouldRefreshAuthPath`, rutas públicas y autenticadas, propagación de cookies; comprobar estado del último commit).
- Navegador: sesión Dirección válida → `/entrada` → `/resumen`; José Luis válido → `/agente`.
- Navegador: sin sesión → `/login`; autenticado sin autorización → `/acceso-restringido`.
- Cerrar sesión y confirmar bloqueo del agente; probar expiración/renovación de cookies en `/entrada`, `/login` y `/agente`, además del flujo de recuperación.
- Probar protección de preview Vercel, callback de recuperación, y confirmar que José Luis no puede abrir `/finanzas`, `/prospectos` o mutar datos.
- No fusionar ni publicar sin aprobación de Dirección y QA de seguridad.
