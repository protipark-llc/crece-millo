# Despliegue en Vercel + Supabase

La aplicación queda en **Vercel** (Next.js) y la base de datos en **Supabase** (PostgreSQL). El repositorio ya trae todo lo necesario:

| Archivo | Para qué |
|---|---|
| `vercel.json` | Usa `npm run vercel-build` y la región `iad1` (Washington D. C., EE. UU.) |
| `npm run vercel-build` | Aplica las migraciones (solo si `MIGRATE_ON_BUILD=true`), crea la cuenta inicial si se definió y compila |
| `drizzle/0002_supabase_hardening.sql` | Cierra la API pública de Supabase (`anon`/`authenticated`) sobre las tablas de la app |
| `src/lib/db/client.ts` | Pool pequeño en Vercel y TLS verificado con el certificado de Supabase |
| `scripts/supabase-app-role.sql` | (Opcional) rol de ejecución sin privilegio para saltarse RLS |
| `.github/workflows/ci.yml` | Tipos, pruebas unitarias, de integración (PostgreSQL real) y build en cada PR |

## Costos

- **Supabase Free**: suficiente para probar. Pausa el proyecto tras ~1 semana sin actividad y no incluye copias de seguridad diarias; para producción con usuarios reales conviene el plan Pro.
- **Vercel Hobby**: gratuito pero solo para uso **no comercial**. Para la plataforma comercial se necesita el plan Pro.

Revisa los precios vigentes en cada sitio antes de pasar a producción.

## 1. Supabase

1. En [supabase.com](https://supabase.com) → **New project**.
   - Organización: la de Protipark. Nombre: `crece`.
   - **Database password**: genera una fuerte y guárdala en tu gestor de contraseñas.
   - **Region**: *East US (North Virginia)*, la misma zona que Vercel `iad1` (menos latencia).
2. Cuando el proyecto esté listo, pulsa **Connect** (arriba) y copia dos cadenas, reemplazando `[YOUR-PASSWORD]`:
   - **Transaction pooler** (puerto **6543**) → será `DATABASE_URL`.
   - **Session pooler** (puerto **5432**) → será `MIGRATION_DATABASE_URL`.
   Vercel solo sale por IPv4; usa los *poolers*, no la conexión directa.
3. **Project Settings → Database → SSL Configuration → Download certificate**. Abre el archivo `.crt` con un editor de texto y copia todo su contenido (desde `-----BEGIN CERTIFICATE-----` hasta `-----END CERTIFICATE-----`) → será `DATABASE_CA_CERT`.
4. Recomendado: **Project Settings → Data API** → desactiva la Data API. La aplicación no la usa (todo pasa por el servidor); la migración 0002 ya la bloquea, esto agrega otra capa.

## 2. Vercel

1. En [vercel.com](https://vercel.com) → **Add New… → Project → Import Git Repository** → elige `protipark-llc/crece-millo` (si no aparece, instala la app de Vercel en la organización de GitHub).
2. Framework: Next.js (se detecta solo). No cambies los comandos: `vercel.json` ya los define.
3. **Environment Variables** (marca solo **Production**):

   | Nombre | Valor |
   |---|---|
   | `DATABASE_URL` | cadena del *Transaction pooler* (6543) |
   | `MIGRATION_DATABASE_URL` | cadena del *Session pooler* (5432) |
   | `DATABASE_CA_CERT` | contenido completo del certificado `.crt` (da igual si se pierden los saltos de línea al pegar) |
   | `MIGRATE_ON_BUILD` | `true` |
   | `BOOTSTRAP_USER_EMAIL` | correo de la cuenta inicial, p. ej. `ceo@protipark.com` |
   | `BOOTSTRAP_USER_PASSWORD` | contraseña **temporal** de esa cuenta |
   | `BOOTSTRAP_USER_NAME` | nombre visible (opcional), p. ej. `CEO Protipark` |

   No hace falta `SESSION_COOKIE_SECURE`: en Vercel la cookie de sesión es `Secure` automáticamente.
   La cuenta inicial se crea una sola vez; en despliegues posteriores no se modifica.
4. **Settings → Git → Production Branch**: `main`.
5. Fusiona el PR #1 en `main` (o pulsa **Deploy**). El build aplica las migraciones en Supabase y publica la app en `https://<proyecto>.vercel.app`.
6. Abre la URL, entra en **/ingresar** con la cuenta inicial y recorre los pasos de prueba del README.
7. **Cambia la contraseña temporal** en **Configuración → Seguridad** (mínimo 10 caracteres, con letras y números).
8. En Vercel, **borra** `BOOTSTRAP_USER_PASSWORD` (y si quieres las otras `BOOTSTRAP_*`). Ya no se necesitan y no conviene dejar una contraseña guardada.

### Despliegues de vista previa (PR)

Las migraciones y la cuenta inicial **solo se ejecutan en el entorno Production de Vercel**, aunque las variables estén asignadas también a Preview: una vista previa nunca modifica la base de producción. Si dejaste las variables de base de datos en Preview, la vista previa funcionará contra la base de producción (solo lectura y escritura normal de la app); para aislarla, quítalas de Preview o usa un proyecto de staging. Si quieres vistas previas funcionales, crea un segundo proyecto de Supabase (staging) y asigna sus cadenas a las variables del entorno **Preview** (con `MIGRATE_ON_BUILD=true` solo ahí si quieres migrar staging automáticamente).

## 3. Datos de demostración (opcional, solo en staging)

El usuario demo tiene una contraseña conocida; no lo crees en producción. En un proyecto de staging, desde tu computador:

```bash
DATABASE_URL="<session pooler 5432 de staging>" \
DATABASE_CA_CERT="$(cat prod-ca-2021.crt)" \
DEMO_PASSWORD="otra-clave-larga" npx tsx scripts/seed-demo.ts
```

## 4. Endurecimiento recomendado (opcional)

En Supabase el usuario `postgres` puede saltarse RLS, así que en producción la barrera efectiva son los filtros por usuario del código y las claves foráneas compuestas. Para que RLS también se aplique siempre:

1. Ejecuta `scripts/supabase-app-role.sql` en el **SQL Editor** (cambia la contraseña).
2. En Vercel, cambia `DATABASE_URL` para que use el usuario `crece_app.<project-ref>` con esa contraseña (mismo host y puerto 6543).
3. Deja `MIGRATION_DATABASE_URL` con `postgres`: las migraciones necesitan ser dueñas de las tablas.

## 5. Dominio propio

Vercel → **Settings → Domains** → agrega tu dominio y crea los registros DNS que indica.

## Solución de problemas

Primero abre **`https://<tu-proyecto>.vercel.app/api/salud`**. Devuelve, sin datos sensibles, si hay conexión con la base, cuántas migraciones están aplicadas frente a las esperadas, si existe la cuenta inicial, el tipo de host (`connection.host`: `supabase-pooler`, `supabase-direct`…), el puerto y el código de error, y en `problem` la causa y qué hacer.

| Síntoma | Causa probable |
|---|---|
| `self-signed certificate in certificate chain` | El registro del build muestra una línea `>>>` con la causa exacta: falta `DATABASE_CA_CERT` en ese entorno, el texto pegado no es un certificado, o no es el certificado de tu proyecto. El certificado puede pegarse con o sin saltos de línea. Último recurso temporal: `DATABASE_SSL_NO_VERIFY=true` (cifra pero no verifica el servidor). |
| `No se pudo alcanzar el servidor` / `ENOTFOUND` / `ETIMEDOUT` | Si `connection.host` es `supabase-direct`, la URL usa `db.<ref>.supabase.co` (solo IPv6): cámbiala por la del *Transaction pooler* (puerto 6543). Si es `supabase-pooler`, revisa que el proyecto no esté pausado y que la URL esté copiada completa. |
| `password authentication failed` | Contraseña sin reemplazar en la cadena, o usuario sin el sufijo `.<project-ref>` en el pooler. |
| `Migraciones omitidas en este build` | `MIGRATE_ON_BUILD` no está en `true` para ese entorno (esperado en vistas previas). |
| El build falla en «Cuenta inicial» | Las variables `BOOTSTRAP_*` están en un entorno sin base de datos (p. ej. Preview). Déjalas solo en Production. |
| Errores 500 justo después de crear el proyecto | El proyecto de Supabase estaba en pausa o aún iniciando; reintenta en un minuto. |
