# Panel Novarix

App interna (separada del sitio novarix.agency) para llevar pagos a colaboradores, cobros de clientes, tareas y recordatorios. Next.js 14 + Postgres (Railway) con login propio (sin proveedores externos de auth).

## 1. Crear la base de datos en Railway

1. En tu proyecto de Railway (el mismo donde vas a alojar la app), **New → Database → Add PostgreSQL**.
2. Andá a la pestaña **Variables** del servicio de Postgres y copiá el valor de `DATABASE_URL` (interna, solo sirve entre servicios de Railway).
3. Para conectarte desde tu computadora (desarrollo local), andá a **Settings → Networking → Public Networking** del servicio de Postgres, activalo, y copiá el valor de `DATABASE_PUBLIC_URL` que aparece — esa es la que vas a usar en tu `.env.local`.
4. Conectate a la base (con `psql`, TablePlus, DBeaver, o el botón **Query** del dashboard de Railway) y corré `db/migrations/0001_init.sql` una vez, a mano. De ahí en adelante **no hace falta correr nada más a mano**: el resto de las migraciones (`0002` en adelante) se aplican solas en cada deploy — ver la sección de Migraciones más abajo.
   - `0002_seed.sql` es **opcional**, solo para tener datos de prueba en desarrollo. Crea 3 usuarios de prueba (`admin@novarix.test`, `programador@novarix.test`, `marketing@novarix.test`, todos con contraseña `novarix123`) más clientes, pagos y tareas de ejemplo. **No correr esto en producción.**

## 2. Variables de entorno

Copiá `.env.local.example` a `.env.local` y completá:

```
DATABASE_URL=postgresql://user:password@host:port/railway
ENCRYPTION_KEY=                # openssl rand -base64 32
SESSION_SECRET=                # openssl rand -base64 32 (puede ser cualquier string largo y aleatorio)

# Bucket de archivos (adjuntos de tickets, reportes, archivos compartidos).
# En producción son "reference variables" de Railway, apuntando al bucket
# del proyecto -- nunca se escriben a mano.
BUCKET_ENDPOINT=
BUCKET_ACCESS_KEY_ID=
BUCKET_SECRET_ACCESS_KEY=
BUCKET_REGION=
BUCKET_NAME=

# Opcionales -- sin estas, Sentry/Resend/IA quedan inactivos (no rompe nada)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
RESEND_API_KEY=
RESEND_FROM=
# Asistente de IA y botones "Generar con IA" (console.anthropic.com)
ANTHROPIC_API_KEY=
```

- `ENCRYPTION_KEY`: cifra secretos guardados en la base (hoy: el secreto TOTP de 2FA; a futuro: tokens de integraciones como Meta). Si la perdés, lo cifrado con ella queda irrecuperable.
- `SESSION_SECRET`: firma el token intermedio de login en dos pasos (2FA). No reutilices `ENCRYPTION_KEY` acá a propósito, para que un compromiso de una no afecte a la otra.

En local, usá la `DATABASE_PUBLIC_URL` del paso 1.3. En producción (deploy en Railway) se usa la privada — ver la sección de deploy.

## 3. Crear tu usuario admin (una sola vez)

No hay pantalla de registro pública — es intencional, esta app es solo para el equipo. Conectate a la base (igual que en el paso 1.4) y corré, reemplazando el email, la contraseña y tu nombre:

```sql
insert into public.profiles (email, password_hash, full_name, role)
values ('tu@email.com', crypt('tu-contraseña', gen_salt('bf')), 'Tu nombre', 'admin');
```

Ya podés entrar al panel con ese email/contraseña. Desde **Usuarios** dentro del panel vas a poder crear las cuentas de programadores y marketing — el panel te va a mostrar una contraseña temporal para pasarles (esas cuentas van a tener que cambiarla en su primer ingreso).

## 4. Correr en local

```bash
npm install
npm run dev
```

Se levanta en [http://localhost:3001](http://localhost:3001) (puerto distinto al del sitio principal, que corre en el 3000, así podés tener ambos abiertos a la vez).

## 5. Tests

```bash
npm test
```

Corre con Vitest. Cubre sobre todo autorización: qué puede hacer cada rol (`lib/auth/permissions.test.ts`), qué ve cada uno en la navegación (`components/nav/links.test.ts`), cifrado (`lib/crypto/encryption.test.ts`) y 2FA (`lib/auth/totp.test.ts`, `lib/auth/twoFactorPending.test.ts`). Corre automáticamente en GitHub Actions (`.github/workflows/panel-tests.yml`) en cada push/PR que toque `panel/**`.

## 6. Migraciones

El esquema se mantiene solo: `scripts/migrate.js` corre automáticamente antes de levantar el server (ver `scripts/start.js`) y aplica cualquier archivo nuevo de `db/migrations/*.sql` que todavía no esté aplicado, dejando registro en la tabla `schema_migrations`. **Nunca edites una migración ya aplicada** — el runner lo detecta (por checksum) y aborta el deploy en vez de arriesgarse a aplicar algo distinto a lo que ya corrió en otro lado. Si necesitás un cambio de esquema, sumá un archivo nuevo (`0010_...`, etc.).

La primera vez que corre contra una base que ya tenía el esquema viejo aplicado a mano (de cuando este runner no existía todavía), se auto-detecta y registra esas migraciones como ya aplicadas sin volver a correrlas — no hace falta ningún paso manual aparte.

En local, si corriste solo `0001_init.sql` a mano, podés traer tu base al día con:

```bash
npm run migrate
```

## 7. Deploy en Railway (ya configurado)

Este proyecto **no** es parte del sitio estático de `novarix.agency` (ese sigue en Hostinger) — necesita un hosting que corra un servidor Next.js de verdad (no hosting estático).

El servicio `panel` en Railway ya está conectado al repositorio de GitHub (`joaquinpiastre/Novarix-web`, rama `main`), con:
- **Root Directory**: `panel` — clave, porque el repo tiene el sitio de marketing en la raíz.
- **Watch paths**: `panel/**` — así un push que solo toca el sitio (fuera de `panel/`) no dispara un rebuild innecesario del panel.
- `DATABASE_URL` cargada como **reference variable** a la base: `${{Postgres.DATABASE_URL}}` (conexión privada e interna).
- **Healthcheck Path**: `/api/health` (hace un `select 1` contra la base; si falla, Railway no promueve el deploy).

**Cualquier `git push` a `main` que toque algo dentro de `panel/` redespliega solo** — build, migraciones y arranque del server, sin intervención manual.

### Backups

Verificar en el dashboard de Railway del servicio de Postgres (pestaña **Backups**) que los backups automáticos estén habilitados, y cada tanto confirmar que hay backups recientes. Railway no los activa con una retención específica por defecto en todos los planes — si el plan actual no incluye backups automáticos, considerar un backup manual periódico (`pg_dump` contra `DATABASE_PUBLIC_URL`) hasta confirmar que sí los incluye.

## 8. Observabilidad

- `/api/health` — chequeo de salud (usado por Railway).
- Sentry (`@sentry/nextjs`) está integrado pero **inactivo mientras no se configure `SENTRY_DSN`**. Para activarlo: crear una cuenta/proyecto en Sentry, y cargar `SENTRY_DSN` (o `NEXT_PUBLIC_SENTRY_DSN` para que valga también del lado del cliente) como variable de entorno en Railway. `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` son solo para que el build suba sourcemaps; sin ellos el build igual funciona (sube en modo `dryRun`).
- Logs estructurados (`lib/log.ts`) van a stdout, que Railway ya captura.

## Estructura

- `app/login` — login (única ruta pública), en dos pasos si el usuario tiene 2FA activado.
- `app/(app)` — todo lo que requiere sesión: `dashboard`, `payments/out` (pagos a colaboradores), `payments/in` (cobros a clientes, solo admin), `tasks`, `reminders` (solo admin), `admin/users` (alta de usuarios, solo admin), `account` (cambio de contraseña propio y 2FA, cualquier rol).
- `middleware.ts` — solo chequea que exista la cookie de sesión y deja pasar `/api/*` sin ese chequeo (cada ruta de API se autentica a su manera). No puede validar la sesión contra la base: el middleware de Next corre en un runtime que no soporta conexiones a Postgres. La validación real ocurre en `getSessionProfile()`.
- `lib/db.ts` — pool de conexión a Postgres.
- `lib/auth/session.ts` — hash/verificación de contraseñas y manejo de sesiones (tabla `sessions`, cookie httpOnly).
- `lib/auth/getSessionProfile.ts` — lee la cookie, valida la sesión contra la base, y devuelve el usuario actual. Es el punto real de control de acceso de toda la app.
- `lib/auth/permissions.ts` — matriz de permisos por rol (`can()`, helpers de scope). No importa nada de `next/headers`: lo usan también componentes de cliente (la navegación).
- `lib/auth/requirePermission.ts` — versión server-only de arriba, para páginas y server actions.
- `lib/auth/rateLimit.ts` — límite de intentos de login (por email e IP), contra Postgres.
- `lib/auth/totp.ts`, `lib/auth/twoFactorPending.ts` — 2FA por TOTP.
- `lib/crypto/encryption.ts` — AES-256-GCM para secretos guardados en la base.
- `lib/audit/log.ts` — registro de auditoría (`audit_log`) para mutaciones sensibles.
- `scripts/migrate.js`, `scripts/bootstrap-migrations.js` — ver sección de Migraciones.
- `db/migrations` — esquema SQL. Sin Row Level Security (esto es Postgres liso, no Supabase): las reglas de "quién ve qué" están escritas directamente en las consultas de cada página/acción (`WHERE recipient_id = $1`, etc.) y centralizadas en `lib/auth/permissions.ts`, no en la base.

## Roles

- **admin** (vos): acceso total.
- **programmer** / **marketing**: ven su propio resumen en el dashboard, su propio historial de pagos recibidos (`payments/out`), y sus tareas asignadas (más las sin asignar, pueden cambiarles el estado). No tienen acceso a `payments/in`, `reminders` ni `admin/users`.

## Calendario de contenido (`/calendar`)

Vista mensual de **cuándo se graba** cada pieza (y, opcional, cuándo se publica), de todos los clientes, filtrable por cliente y por responsable. Tocar un día crea una pieza con esa fecha; tocar una pieza la abre para editar.

Cada pieza tiene: cliente, título/idea, tipo de contenido (reel, post, carrusel, historia, video largo, anuncio, vivo, otro), redes sociales (varias), fecha de grabación, fecha de publicación, responsable, estado, guion, copy, notas especiales y link a archivos. El mismo formulario se usa desde la pestaña **Marketing** de cada cliente.

- **Responsable**: solo se puede delegar a personas con rol `marketing` o `marketing_admin` (validado en el server, `lib/marketing/contentItems.ts`). Al delegar, la persona recibe una notificación con link directo a la pieza.
- **Quién lo ve**: `admin` y `marketing_admin` ven y editan todo. `marketing` ve solo lo que tiene delegado y puede cambiarle el estado (para editar el resto, entra por la ficha de un cliente al que esté asignado).
- Las fechas se interpretan siempre en hora de Mendoza (UTC-3), también en el server.

## Asistente de IA (`/assistant`)

Disponible **solo para `admin` y `marketing_admin`** (permiso `ai.use`; `marketing`, `programmer` y clientes no lo ven). Usa Claude (`claude-opus-5-5`) y necesita `ANTHROPIC_API_KEY`; sin la clave, la pantalla muestra un aviso y nada se rompe.

- **Qué puede hacer**: consultar clientes, contenido, tareas, tickets, métricas de Meta y (solo admin) finanzas; **cargar y modificar** contenido del calendario (con guion y copy), tareas, datos de clientes, campañas, estado/prioridad/asignación de tickets y recordatorios.
- **Qué no puede hacer**: modificar el código, la configuración, usuarios o pagos, ni borrar registros. No es una restricción "de palabra": la IA solo puede actuar a través de las herramientas de `lib/ai/tools.ts`, y no existe ninguna herramienta para eso.
- **Permisos**: cada herramienta exige el mismo permiso que la pantalla equivalente, y se revalida al ejecutarla. Un `marketing_admin` no puede, vía IA, ver finanzas ni crear tareas, igual que en el panel.
- **Trazabilidad**: toda modificación queda en `audit_log` como `ai.<herramienta>`, con quién la pidió. Las conversaciones son privadas de cada persona (`ai_conversations`) y guardan cuántos tokens se usaron.
- **Otros usos de la IA**: el botón "Generar guion y copy con IA" en cada pieza de contenido (usa el tono de marca y los copys recientes del cliente) y "Sugerir respuesta con IA" en los tickets (solo arma el borrador; nada se envía solo).

## Portal de clientes

Ver `ARCHITECTURE.md` para el modelo de datos completo y la matriz de
permisos del rol `client`. Resumen:

- Alta por **invitación** (link firmado, un solo uso, 72hs) desde la ficha
  del cliente o desde **Mi cuenta** del propio portal (el `owner` invita a
  sus compañeros como `member`) — no más contraseñas temporales en pantalla.
- Login separado en `/portal/login`, con recuperación de contraseña propia
  (`/portal/forgot-password`).
- **Tickets** (`/tickets` del lado del equipo, `/portal/tickets` del lado
  del cliente): reclamo, pedido/cambio, soporte técnico, consulta, pedido
  de contenido o facturación, con SLA por prioridad (horario hábil,
  America/Argentina/Mendoza), hilo de mensajes (con notas internas que el
  cliente nunca ve), adjuntos, auto-asignación por tipo, y encuesta de
  satisfacción al cerrar. Métricas en `/tickets/metrics`.
- Modo **"ver como cliente"** (solo lectura, auditado) para admin/
  marketing_admin desde Cliente 360.
- Dominio dedicado `clientes.novarix.agency` — requiere agregar un CNAME y
  un TXT de verificación en el DNS de `novarix.agency` (valores exactos en
  `ARCHITECTURE.md`); mientras no se agreguen, el portal sigue funcionando
  normal en `panel.novarix.agency/portal`.

### Checklist de prueba manual

- [ ] Invitar un usuario nuevo desde Cliente 360, aceptar la invitación
      (`/portal/accept-invite?token=...`) y loguearse en `/portal/login`.
- [ ] Como ese cliente, intentar entrar a `/clients`, `/tasks`, `/tickets`
      (rutas internas) — debe redirigir a `/portal`.
- [ ] Como cliente A, anotar el ID de un ticket/archivo/reporte propio;
      logueado como cliente B, pegar esa URL/ID a mano — debe dar 403 o
      "no encontrado", nunca el dato de A.
- [ ] Abrir un ticket desde el portal con un adjunto, verificar que llega
      la notificación al equipo, responder desde `/tickets/[id]`, verificar
      que el cliente ve la respuesta pero no las notas marcadas "interna".
- [ ] Marcar un ticket resuelto desde el portal, reabrirlo (debe funcionar
      dentro de los 7 días), y completar la encuesta de satisfacción al
      cerrarlo.
- [ ] Desde Cliente 360, usar "ver como cliente" — confirmar que las
      acciones de escritura del portal devuelven el error de solo lectura,
      y que `audit_log` registra el acceso.
- [ ] Como `owner`, invitar y luego desactivar a un `member` desde
      `/portal/account` — confirmar que el `member` desactivado no puede
      volver a loguearse.

### Checklist — calendario e IA

- [ ] En `/calendar`, tocar un día, crear un reel con dos redes, guion y
      notas, y delegarlo a alguien de marketing — verificar que le llega la
      notificación y que el link abre la pieza.
- [ ] Intentar delegar a un admin o programador: no aparecen en la lista (y
      el server lo rechaza si se fuerza).
- [ ] Entrar como `marketing`: ver solo lo delegado, poder cambiar el
      estado, no ver "Asistente IA" en el menú.
- [ ] Con `ANTHROPIC_API_KEY` cargada, pedirle al asistente "armá 2 reels
      para <cliente> el jueves a las 10, asignados a <persona>" y verificar
      que aparecen en el calendario y en `audit_log` como `ai.crear_contenido`.
- [ ] Como `marketing_admin`, pedirle al asistente las finanzas del mes:
      tiene que responder que no tiene acceso.

## Seguridad

- **No hay una segunda capa de seguridad a nivel de base de datos** (RLS) — toda la restricción de acceso vive en `lib/auth/permissions.ts` y se aplica desde `app/(app)/**` vía `requirePermission()`/`can()`. Cualquier ruta o acción nueva tiene que pasar por ahí; `lib/auth/permissions.test.ts` falla si se agrega un permiso nuevo sin un caso de test que lo cubra.
- Login: rate limit (5 intentos fallidos / 15 min, por email y por IP), rotación de sesión, invalidación de otras sesiones al resetear contraseña, cambio de contraseña obligatorio en cuentas nuevas o reseteadas, 2FA opcional (TOTP) para cualquier rol desde **Mi cuenta**.
- Toda alta/reseteo de usuario y toda mutación de pagos queda en `audit_log` (quién, qué, antes/después, IP). Lo mismo para todo cambio hecho por el asistente de IA (`ai.*`) y para las altas/ediciones/bajas de contenido.
