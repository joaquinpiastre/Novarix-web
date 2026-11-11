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

## Calendario de contenido y asistente de IA (migración 0019)

- `content_items` suma `recording_at` (fecha de grabación, la que usa `/calendar`), `channels text[]` (redes; `channel` queda como la lista unida, por compatibilidad), `script` (guion) y `notes`. Toda alta/edición pasa por `lib/marketing/contentItems.ts`, que valida con zod, interpreta fechas en hora de Mendoza y exige que el responsable tenga rol `marketing` o `marketing_admin`.
- `ai_conversations`: una fila por conversación, privada de su autor (`profile_id`). `messages` guarda el historial exactamente como lo devuelve la API de Claude (hay que reenviarlo sin modificar), más el conteo de tokens.

### Modelo de seguridad de la IA

```
pedido ──► /assistant (requirePermission "ai.use": admin, marketing_admin)
              │
              ▼
        lib/ai/agent.ts ── loop con Claude (máx. 12 pasos)
              │  el modelo solo puede pedir herramientas
              ▼
        lib/ai/tools.ts ── runTool():
              1. ¿existe la herramienta?           (si no: error)
              2. can(profile, permiso de la herramienta)  (mismo permiso que la pantalla)
              3. zod valida el input
              4. ejecuta SQL parametrizado / la misma server action del panel
              5. si escribió: audit_log "ai.<herramienta>"
```

- La lista de herramientas que se le ofrece al modelo ya viene filtrada por permisos, y además se revalida en cada ejecución (el modelo no puede "pedir" una que no se le ofreció).
- No hay herramientas para borrar, ni para usuarios, pagos, configuración o código: la IA no tiene forma de hacerlo.
- Los textos que vienen de la base (tickets, comentarios de clientes) se tratan como datos; el prompt de sistema lo explicita para reducir riesgo de prompt injection, y de todos modos el alcance máximo es el de los permisos de la persona.

## Radar viral, diagnóstico de videos y caja de ideas (migraciones 0020–0022)

### APIs verificadas en la documentación oficial (2026-11-11)

| API | Qué se confirmó | Consecuencia en el diseño |
|---|---|---|
| YouTube Data API v3 | Cuota de 10.000 unidades por día; `search.list` cuesta 1 unidad pero tiene **su propio tope de 100 llamadas por día**; `videos.list`/`channels.list` cuestan 1 unidad cada una (hasta 50 ids). `order=viewCount`, `publishedAfter`, `regionCode`, `relevanceLanguage`, `videoDuration=short` (< 4 min). **No hay filtro de Shorts.** | Tope propio `YOUTUBE_SEARCH_DAILY_CAP` (90 por defecto), contado en `provider_usage` por día del Pacífico. Shorts = `short` + duración real ≤ `max_duration_seconds`. |
| Políticas de YouTube API Services | Estadísticas de terceros: máximo 30 días sin refrescar; no reemplazar números de YouTube por cálculos propios; embeds respetando Made for Kids. | `lib/trends/maintenance.ts`: refresca a los 25 días lo que está en tableros y borra lo demás a los 30. Los scores se muestran como "métrica Novarix" al lado del número original. Embed por `youtube-nocookie.com`. |
| IG Hashtag Search (`ig_hashtag_search`, `top_media`, `recent_media`) | Requiere la función **Instagram Public Content Access** (App Review + verificación del negocio). Límite de **30 hashtags únicos cada 7 días**. `top_media` y `recent_media` (últimas 24 h) devuelven likes y comentarios, **sin vistas ni usuario**. Uso para marketing: solo datos agregados o anónimos. | Apagado por defecto (`TRENDS_IG_HASHTAG_SEARCH`). Límite controlado en `ig_hashtag_queries` (tope propio de 28). Esos videos no tienen outlier ni velocidad: el peso se reparte entre los componentes que sí hay. |
| IG Business Discovery | Permisos `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`. Solo cuentas Business/Creator. Devuelve `followers_count` y, por media, `like_count`, `comments_count` y `view_count` (este último **solo** por Business Discovery). | Fuente principal de Instagram: cuentas referentes del plan y competidores. Outlier = vistas ÷ promedio de vistas de la cuenta. |
| IG Media Insights (nuestros reels) | REELS: `views`, `reach`, `saved`, `shares`, `likes`, `comments`, `total_interactions`, `ig_reels_avg_watch_time`, `ig_reels_video_view_total_time` (varios marcados "en desarrollo"). | `syncInstagramMedia` en `lib/meta/sync.ts` llena `social_posts` (antes la tabla existía pero no se llenaba). |
| Graph API (versiones) | v21.0 vence el 21/01/2027; la última es v26.0 (29/07/2026). | Se pasó a v26.0 (`META_GRAPH_VERSION` para volver atrás si hace falta). **Probar la sync de Meta después del deploy.** |
| oEmbed de Instagram | `GET /instagram_oembed`, hasta 1.000 pedidos por hora. La página no aclara si hace falta la función "Meta oEmbed Read". | No se usa: los reels se muestran con el iframe `/embed/` de la publicación o link al original. |
| Meta Ad Library API (`ads_archive`) | Fuera de la UE/Reino Unido solo devuelve anuncios políticos o de temas sociales. | Para Argentina, link directo a la Biblioteca filtrada por página o nombre del anunciante. |
| TikTok Research API | Solo instituciones académicas o sin fines de lucro, independientes de intereses comerciales. **Una agencia no califica.** | No se usa. |
| TikTok oEmbed / Embed Player | oEmbed sin autenticación y sin métricas; "Embed Videos" se va a deprecar. Embed Player: `tiktok.com/player/v1/{id}`. | Links manuales con oEmbed (texto, autor, miniatura) y Embed Player para mostrar el video. Las métricas se cargan a mano (opcional). |
| Apify `clockworks/tiktok-scraper` | Desde USD 1,70 cada 1.000 resultados; los filtros de fecha y orden se cobran aparte. Trae vistas, likes, comentarios, compartidos, guardados y seguidores. | Detrás de `TRENDS_TIKTOK_PROVIDER=apify`, **apagado**. Ver riesgos abajo. |

### TikTok vía terceros: riesgos (decisión pendiente de Novarix)

- **Términos de uso**: es scraping, y los términos de TikTok lo prohíben. El riesgo legal y reputacional es de quien usa los datos, no de Apify.
- **Estabilidad**: se rompe cuando TikTok cambia su web, y no tiene SLA sobre los datos.
- **Costo**: unos USD 0,03 a 0,05 por búsqueda con 20 resultados por consulta, más los filtros cobrados. Se registra en `provider_usage` y cuenta para el presupuesto mensual.

### Flujo de una búsqueda

```
prompt + filtros ──► createSearch (server action)
                       ├─ límites (por rol y día, presupuesto mensual)
                       └─ planSearch (Claude, salida JSON validada con zod) ──► status "ready"
plan editable ──► runSearch ──► ¿mismo plan en las últimas N horas? → copia resultados (caché)
                       └─► job pg-boss "trend-search" ──► runSearchJob
                              proveedores en paralelo → dedup (plataforma + id) → trend_videos (+ historial de métricas)
                              → scores propios → relevancia IA (lote) → descarta irrelevantes
                              → análisis IA del top N (con visión sobre la miniatura; caché por video y cliente)
                              → patrones del top → "done" + costo
```

### Score (transparente: `lib/trends/score.ts`, con tests)

- **Outlier**: vistas ÷ promedio de vistas de la cuenta (o ÷ seguidores). Escala logarítmica: 1x ≈ 18, 10x ≈ 61, 50x o más = 100.
- **Velocidad**: vistas por día desde la publicación, en escala logarítmica relativa al video más rápido de la misma búsqueda.
- **Engagement**: (likes + comentarios + compartidos + guardados) ÷ vistas. Un 10% equivale a 100 puntos.
- **Relevancia**: de 0 a 100, según la IA. Por debajo de 35 el video se descarta.
- **Final**: promedio ponderado con los pesos de `/admin/consumo`. Si falta un componente, su peso se reparte entre los demás.

### Modelo de datos

- `trend_settings`: una sola fila con pesos, TTL del caché, top N, límites por rol, presupuesto y el aviso del mes.
- `trend_videos`: clave única (plataforma, id externo), sin archivos de video; `metrics_history` guarda hasta 30 puntos.
- `trend_searches`, `trend_search_results` y `trend_analyses`: el análisis tiene clave única (video, cliente), así que se reutiliza entre búsquedas.
- `swipe_boards` y `swipe_items`: tableros por cliente o temáticos.
- `saved_searches`: alertas que revisa un job cada hora; avisan solo los videos que no aparecieron en corridas anteriores.
- `provider_usage`: cada llamada a YouTube, Meta, Apify o Claude, con costo estimado y tokens, por persona, cliente y búsqueda.
- `ig_hashtag_queries`: ventana de 7 días del límite de Meta.
- `social_posts` (columnas nuevas) y `video_diagnostics`: el diagnóstico.
- `idea_bank`, `competitors`, `commercial_dates`, `commercial_date_notices` y `strategy_chats`: la caja de ideas.

Nota: node-postgres devuelve `bigint` como texto (`lib/db.ts` solo convierte `numeric`). El código nuevo pasa las métricas a número con `numifyVideo`/`toNumberOrNull` (en `lib/trends/store.ts`).

### Permisos

| | admin | marketing_admin | marketing | programmer | client |
|---|---|---|---|---|---|
| `trends.use` (Radar, diagnóstico, ideas) | ✅ todo | ✅ todo | ✅ solo clientes de su `client_team` (cliente obligatorio) | ❌ | ❌ |
| `usage.view` (`/admin/consumo`) | ✅ | ❌ | ❌ | ❌ | ❌ |

- El alcance se resuelve en `lib/trends/access.ts`: búsquedas propias o de clientes del alcance, y tableros de clientes del alcance o creados por la persona.
- "Compartir con el cliente" crea la pieza en estado `aprobacion_cliente`, con el mismo circuito de aprobación que ya tiene el portal.
- Toda escritura queda en `audit_log` (`trends.*`, `ideas.*`, `competitors.*`, `diagnostic.generate`, `usage.settings.update`).
- Las claves (`YOUTUBE_API_KEY`, `ANTHROPIC_API_KEY`, `APIFY_TOKEN`, `TRENDS_IG_ACCESS_TOKEN`, los tokens de Meta) solo se leen en el servidor. Instagram se configura con `TRENDS_IG_ACCESS_TOKEN` (la cuenta se detecta sola) o con `TRENDS_IG_CONNECTION_ID`.

### Jobs nuevos (pg-boss, en el mismo proceso)

- `trend-search`: corre cada búsqueda, con vencimiento a los 20 minutos y sin reintentos.
- `trend-saved-search-alerts`: corre cada hora, en el minuto 15.
- `trend-maintenance-daily`: corre a las 7:30. Aplica la retención de 30 días de YouTube y avisa de las fechas comerciales con 21 días de anticipación (`COMMERCIAL_DATE_LEAD_DAYS`).

### Test de integración

`lib/trends/pipeline.db.test.ts` corre el pipeline completo contra un Postgres vacío, con el proveedor de ejemplo y la IA simulada: caché, tableros, alertas, diagnóstico, límites, presupuesto, retención de YouTube y fechas comerciales. Las instrucciones están en el encabezado del archivo. En `npm test` normal se saltea.

## "Conectar con Facebook" (Inicio de sesión con Facebook para empresas)

- **Dónde está:** en Cliente 360 → Métricas (equipo con acceso al cliente) y en el portal → Métricas. En el portal solo puede conectar el titular (`client_role = owner`), y nunca en modo "ver como cliente".
- **Flujo:**
  1. `/api/meta/oauth/start` arma un `state` firmado (HMAC con `SESSION_SECRET`, vence en 15 minutos) con el cliente, la persona y el origen. Después redirige al diálogo de Facebook con el `config_id`, o con `scope` si no hay configuración.
  2. `/api/meta/oauth/callback` valida el state y que vuelva la misma persona con su sesión. Revalida el acceso al cliente, canjea el `code` (servidor a servidor, con `META_APP_SECRET`) y revisa el token con `debug_token`. Si es un token de usuario corto, lo pasa a uno de larga duración (60 días).
  3. Guarda o reemplaza la conexión cifrada, agrega solos todos los activos compartidos y lanza la primera sincronización (30 días).
- **Dominio de vuelta:** solo `panel.novarix.agency`, `clientes.novarix.agency` (o los de `META_OAUTH_EXTRA_HOSTS`) y localhost. Nunca se arma con un Host arbitrario, para evitar un open redirect. Cada dominio usa su propia URL de vuelta, porque la cookie de sesión es por dominio.
- **Requisitos de Meta** (documentación al 2026-11-11):
  - Tokens que no vencen: hace falta una configuración de "Inicio de sesión con Facebook para empresas" con tipo de token **usuario del sistema**.
  - La app tiene que pertenecer a un portfolio de la agencia, distinto del de los clientes.
  - Para que conecten clientes que no tienen rol en la app: la app tiene que estar en modo producción, con **Acceso avanzado** aprobado en App Review para cada permiso.
- **Auditoría:** cada conexión queda en `audit_log` (`meta_connections.oauth_connect`).
