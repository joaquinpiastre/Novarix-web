# Panel Novarix

App interna (separada del sitio novarix.agency) para llevar pagos a colaboradores, cobros de clientes, tareas y recordatorios. Next.js 14 + Postgres (Railway) con login propio (sin proveedores externos de auth).

## 1. Crear la base de datos en Railway

1. En tu proyecto de Railway (el mismo donde vas a alojar la app), **New → Database → Add PostgreSQL**.
2. Andá a la pestaña **Variables** del servicio de Postgres y copiá el valor de `DATABASE_URL` (interna, solo sirve entre servicios de Railway).
3. Para conectarte desde tu computadora (desarrollo local), andá a **Settings → Networking → Public Networking** del servicio de Postgres, activalo, y copiá el valor de `DATABASE_PUBLIC_URL` que aparece — esa es la que vas a usar en tu `.env.local`.
4. Conectate a la base (con `psql`, TablePlus, DBeaver, o el botón **Query** del dashboard de Railway) y corré, en este orden:
   - `db/migrations/0001_init.sql` (crea las tablas y las funciones del dashboard).
   - `db/migrations/0002_seed.sql` — **opcional**, solo para tener datos de prueba en desarrollo. Crea 3 usuarios de prueba (`admin@novarix.test`, `programador@novarix.test`, `marketing@novarix.test`, todos con contraseña `novarix123`) más clientes, pagos y tareas de ejemplo. **No correr esto en producción.**

## 2. Variables de entorno

Copiá `.env.local.example` a `.env.local`:

```
DATABASE_URL=postgresql://user:password@host:port/railway
```

En local, usá la `DATABASE_PUBLIC_URL` del paso 1.3. En producción (deploy en Railway), vas a usar la privada — ver paso 5.

## 3. Crear tu usuario admin (una sola vez)

No hay pantalla de registro pública — es intencional, esta app es solo para el equipo. Conectate a la base (igual que en el paso 1.4) y corré, reemplazando el email, la contraseña y tu nombre:

```sql
insert into public.profiles (email, password_hash, full_name, role)
values ('tu@email.com', crypt('tu-contraseña', gen_salt('bf')), 'Tu nombre', 'admin');
```

Ya podés entrar al panel con ese email/contraseña. Desde **Usuarios** dentro del panel vas a poder crear las cuentas de programadores y marketing — el panel te va a mostrar una contraseña temporal para pasarles.

## 4. Correr en local

```bash
npm install
npm run dev
```

Se levanta en [http://localhost:3001](http://localhost:3001) (puerto distinto al del sitio principal, que corre en el 3000, así podés tener ambos abiertos a la vez).

## 5. Deploy en Railway (ya configurado)

Este proyecto **no** es parte del sitio estático de `novarix.agency` (ese sigue en Hostinger) — necesita un hosting que corra un servidor Next.js de verdad (no hosting estático).

El servicio `panel` en Railway ya está conectado al repositorio de GitHub (`joaquinpiastre/Novarix-web`, rama `main`), con:
- **Root Directory**: `panel` — clave, porque el repo tiene el sitio de marketing en la raíz.
- **Watch paths**: `panel/**` — así un push que solo toca el sitio (fuera de `panel/`) no dispara un rebuild innecesario del panel.
- `DATABASE_URL` cargada como **reference variable** a la base: `${{Postgres.DATABASE_URL}}` (conexión privada e interna).

**Esto significa que a partir de ahora, cualquier `git push` a `main` que toque algo dentro de `panel/` redespliega solo.** Ya no hace falta correr `railway up` a mano.

Lo único que **no** se automatiza son los cambios de esquema: si agregás una migración nueva en `db/migrations/`, hay que correrla a mano contra la base de producción (con `railway connect postgres` o el botón Query del dashboard) — el deploy automático no ejecuta SQL por vos.

## Estructura

- `app/login` — login (única ruta pública).
- `app/(app)` — todo lo que requiere sesión: `dashboard`, `payments/out` (pagos a colaboradores), `payments/in` (cobros a clientes, solo admin), `tasks`, `reminders` (solo admin), `admin/users` (alta de usuarios, solo admin).
- `middleware.ts` — solo chequea que exista la cookie de sesión (no puede validarla contra la base: el middleware de Next corre en un runtime que no soporta conexiones a Postgres). La validación real ocurre en `getSessionProfile()`.
- `lib/db.ts` — pool de conexión a Postgres.
- `lib/auth/session.ts` — hash/verificación de contraseñas y manejo de sesiones (tabla `sessions`, cookie httpOnly).
- `lib/auth/getSessionProfile.ts` — lee la cookie, valida la sesión contra la base, y devuelve el usuario actual. Es el punto real de control de acceso de toda la app.
- `db/migrations` — esquema SQL. Sin Row Level Security (esto es Postgres liso, no Supabase): las reglas de "quién ve qué" están escritas directamente en las consultas de cada página/acción (`WHERE recipient_id = $1`, etc.), no en la base.

## Roles

- **admin** (vos): acceso total.
- **programmer** / **marketing**: ven su propio resumen en el dashboard, su propio historial de pagos recibidos (`payments/out`), y sus tareas asignadas (más las sin asignar, pueden cambiarles el estado). No tienen acceso a `payments/in`, `reminders` ni `admin/users`.

## Nota de seguridad

A diferencia de una app con Supabase, acá **no hay una segunda capa de seguridad a nivel de base de datos** (RLS) — toda la restricción de acceso vive en el código de `app/(app)/**`. Si en el futuro se agrega una ruta o acción nueva que toque `payments_out`, `tasks` o `reminders`, hay que acordarse de replicar el mismo filtro por usuario que ya usan las rutas existentes (podés usarlas como referencia).
