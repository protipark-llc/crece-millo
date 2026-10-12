# Seguridad y privacidad

## Controles implementados

| Área | Control |
|---|---|
| Contraseñas | scrypt (N=16384, r=8, p=1, sal aleatoria de 16 bytes), comparación en tiempo constante. Mínimo 10 caracteres con letras y números. |
| Sesiones | Token aleatorio de 32 bytes en cookie `httpOnly`, `SameSite=Lax`, `Secure` en producción (`SESSION_COOKIE_SECURE=true`). En BD solo se guarda el SHA-256 del token. Vigencia 30 días con renovación deslizante; cierre de sesión elimina la sesión. |
| Fuerza bruta | Máximo 5 intentos fallidos por correo en 15 minutos; mensaje genérico (no revela si el correo existe). |
| Autorización | Cada página y acción verifica la sesión en el servidor (`requireUser` / `runAction`). El middleware solo redirige (no es barrera). |
| Aislamiento entre usuarios | 1) Toda consulta filtra por `user_id`; 2) claves foráneas compuestas `(id, user_id)`; 3) **Row Level Security** forzada en las 18 tablas con datos personales, activada por `app.user_id` dentro de cada transacción (`withUser`). Sin contexto, las tablas aparecen vacías. Probado en `tests/integration/finance.test.ts`. |
| Validación | Zod en el servidor para todas las entradas; reglas de negocio en los servicios; restricciones `CHECK`/`UNIQUE` en la BD como última barrera. |
| CSRF | Server Actions de Next.js verifican el origen; cookies `SameSite=Lax`. |
| XSS | React escapa todo el contenido; no se usa `dangerouslySetInnerHTML`. |
| Inyección SQL | Consultas parametrizadas de Drizzle; sin SQL concatenado con datos de usuario. |
| Inyección en CSV | Celdas que empiezan por `= + - @` se neutralizan al exportar. |
| Errores | Mensajes comprensibles sin detalles internos; los errores inesperados se registran en el servidor. |
| Cabeceras | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`; sin `X-Powered-By`. |
| Secretos | Ninguno en el código; `DATABASE_URL` en `.env` (ignorado por git). El cliente no recibe credenciales. |
| Datos en el navegador | No se guarda información financiera en `localStorage`; la fuente de verdad es PostgreSQL. |
| Supabase | La migración 0002 revoca los privilegios de `anon`/`authenticated` (Data API pública) y activa RLS en `users`, `sessions` y `login_attempts`; verificado simulando los privilegios por defecto de Supabase. TLS verificado con el certificado del proveedor (`DATABASE_CA_CERT`). |
| Privacidad | Consentimiento en el registro, política de privacidad (borrador), exportación completa (JSON y CSV) y eliminación definitiva de la cuenta con confirmación por contraseña. |
| Auditoría | `audit_log` registra creación, edición, anulación y eliminación de datos financieros. |
| Dependencias | `npm audit`: 0 críticas/altas en producción. Quedan 4 moderadas en `drizzle-kit` (herramienta de desarrollo, no se despliega). |

## Riesgos y tareas pendientes

- No hay verificación de correo, recuperación de contraseña ni segundo factor.
- El límite de intentos es por correo; falta límite por IP / a nivel de proxy.
- No hay Content-Security-Policy estricta (requiere nonces para los scripts de Next.js).
- El rol de base de datos de la aplicación es dueño de las tablas; en Supabase el rol `postgres` puede saltarse RLS. Para producción, usar el rol `crece_app` de `scripts/supabase-app-role.sql` (solo DML, sin BYPASSRLS).
- La política de privacidad es un borrador: requiere revisión jurídica (en Colombia, Ley 1581 de 2012).
- Sin cifrado a nivel de columna; depende del cifrado en reposo del proveedor de BD.
- Superar estas pruebas no garantiza que la plataforma sea completamente segura: se recomienda una revisión de seguridad independiente antes de un lanzamiento comercial.
