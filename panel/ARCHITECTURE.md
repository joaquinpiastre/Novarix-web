# Arquitectura — Portal de clientes

Este documento describe el modelo de datos y la matriz de permisos del
portal de clientes (rol `client`), agregado sobre el Panel Novarix v2.
Se agrega al final del trabajo, como pidió la spec original.

## Modelo de datos

### Identidad y acceso

- **`client_users`** (`profile_id` único, `client_id`, `client_role`
  `owner|member`, `active`): quién de qué empresa puede entrar al portal.
  Reemplaza al modelo viejo de "un perfil = un cliente" (`profiles.client_id`,
  que queda en la tabla por compatibilidad de lectura pero ya no es la
  fuente de verdad para autorización). Un `profile_id` puede estar en
  `client_users` de un solo cliente a la vez (constraint `unique`).
- **`client_invites`** (`client_id`, `email`, `client_role`, `invited_by`,
  `token_hash`, `expires_at`, `accepted_at`): invitaciones de un solo uso,
  72hs. El token nunca se guarda en texto plano — se guarda su hash
  (sha256) y se compara contra el hash del token que llega en la URL.
- **`profiles.email_notifications`**: toggle simple de notificaciones por
  email (las in-app nunca se desactivan).

### Tickets (extiende `support_tickets` de una fase anterior)

- **`support_tickets`**: `number` (NVX-0001, autogenerado por trigger),
  `ticket_type`, `priority`, `status` (nuevo → en_revision → en_curso →
  esperando_cliente → resuelto → cerrado), `related_service_id`,
  `related_project_id`, `assigned_to`, `sla_due_at`, `first_response_at`,
  `resolved_at`, `reopened_until`, `csat_score`, `csat_comment`.
- **`ticket_messages`** (`internal` boolean): hilo de conversación. Los
  mensajes `internal = true` son notas del equipo que el cliente nunca ve
  (filtrados explícitamente en toda query que lee para el portal).
- **`ticket_attachments`**: adjuntos en el bucket de Railway, descarga
  siempre vía URL firmada de 5 minutos generada después de un chequeo de
  pertenencia (ver "Aislamiento" abajo).
- **`ticket_events`**: historial de cambios de estado/prioridad/asignación,
  y marcas de "ya se avisó" de SLA (para no duplicar notificaciones).
- **`tasks.ticket_id`**: un ticket puede convertirse en tarea del tablero
  existente, quedando vinculado.

### Contenido del portal

- **`client_reports`**: reportes mensuales — un admin sube un PDF, el
  cliente lo ve/descarga. No se generan reportes programáticamente.
- **`client_files`** (`direction`: `from_client` | `from_novarix`):
  documentos sueltos compartidos en cualquier dirección, además del kit de
  marca (`brand_kits`, de una fase anterior).

Todo archivo (adjuntos de tickets, reportes, archivos compartidos) vive en
un bucket S3-compatible de Railway (`novarix-portal-files`), cuyas
credenciales llegan a la app como "reference variables" de Railway
(`BUCKET_ENDPOINT`, `BUCKET_ACCESS_KEY_ID`, `BUCKET_SECRET_ACCESS_KEY`,
`BUCKET_REGION`, `BUCKET_NAME`) — nunca se escribieron a mano ni pasaron en
texto plano por ninguna herramienta.

## Autenticación y aislamiento

- **`requireClient()`** (`lib/auth/requireClient.ts`) es el único punto de
  entrada para leer/escribir datos del portal. El `clientId` sale *siempre*
  de la fila de `client_users` ligada al `profile_id` de la sesión (o del
  cookie firmado de "ver como cliente" para admin/marketing_admin) — nunca
  de un parámetro de ruta, query string o campo de formulario. Toda query
  del portal recibe `clientId` desde el resultado de esta función.
- **`lib/portal/queries.ts`**: lista blanca de lecturas para el portal.
  Cada función devuelve solo los campos permitidos; nunca notas internas,
  sueldos/pagos a equipo, costos/márgenes, comentarios marcados
  `internal`/`visible_to_client = false`, tokens, ni datos de otro cliente.
- **Modo "ver como cliente"**: admin/marketing_admin pueden previsualizar
  el portal de un cliente desde Cliente 360 (`startClientPreview`). Es de
  solo lectura — toda acción de escritura del portal llama a
  `assertNotPreview()` primero — y cada acceso queda en `audit_log`
  (`portal.admin_preview_access`).
- **Descarga de archivos**: `app/api/files/{client-reports,client-files,
  ticket-attachments}/[id]/route.ts` verifican pertenencia (el `client_id`
  del recurso tiene que matchear el del que pide la descarga) antes de
  generar la URL firmada de S3. Para tickets, la pertenencia la resuelve
  `lib/tickets/authorize.ts` (ver matriz abajo), que además deja entrar al
  responsable asignado aunque no esté en `client_team`.
- **Tests de aislamiento** (`lib/auth/requireClient.test.ts`,
  `lib/tickets/authorize.test.ts`, `app/portal/tickets/actions.test.ts`):
  verifican que el `clientId` nunca se toma de un campo manipulable, que un
  token de preview de otro admin o vencido no da acceso, y que las acciones
  del portal son no-ops silenciosos (nunca leaks de error revelador) contra
  un ticket de otro cliente.

## Matriz de permisos — rol `client`

El rol `client` **no tiene ningún permiso en `lib/auth/permissions.ts`**
(`ROLE_PERMISSIONS.client = []`) — su acceso es exclusivamente al portal,
gateado por `requireClient()`, nunca por la matriz de permisos interna.
Dentro del portal, el segundo nivel de permisos es `client_role`:

| Acción | `owner` | `member` |
|---|---|---|
| Ver todo lo del portal (tickets, contenido, métricas, facturación, archivos, reportes) | ✅ | ✅ |
| Crear/responder tickets, aprobar contenido, subir archivos | ✅ | ✅ |
| Invitar nuevos usuarios de su empresa | ✅ | ❌ |
| Desactivar usuarios `member` de su empresa | ✅ (nunca a otro `owner`) | ❌ |
| Cambiar su propia contraseña / cerrar sus otras sesiones | ✅ | ✅ |

Permisos internos nuevos para el sistema de tickets (`lib/auth/permissions.ts`):

| Permiso | admin | marketing_admin | programmer | marketing |
|---|---|---|---|---|
| `tickets.manage_all` (ve/gestiona tickets de TODOS los clientes, ve métricas) | ✅ | ✅ | ❌ | ❌ |
| Alcance sin `tickets.manage_all` (`scopeTicketsFor`) | — | — | solo clientes donde está en `client_team`, o tickets asignados a él | idem |

## Dominio dedicado del portal

`clientes.novarix.agency` sirve el mismo servicio de Railway que
`panel.novarix.agency` — `middleware.ts` detecta el host y reescribe
internamente cualquier ruta a su equivalente bajo `/portal`, así el cliente
nunca ve "/portal" en la URL.

El dominio ya está registrado en Railway. **Falta un paso que solo puede
hacer quien administra el DNS de `novarix.agency`** — agregar estos dos
registros en el proveedor de DNS:

| Tipo | Host | Valor |
|---|---|---|
| CNAME | `clientes` | `j490rrv5.up.railway.app` |
| TXT | `_railway-verify.clientes` | `railway-verify=1f05ecb56c85985634fedaf8db5d2da4f7beb4825d6638cae6712388018b4625` |

Railway valida el TXT automáticamente y emite el certificado SSL una vez
que el CNAME propaga (puede tardar hasta un par de horas).
