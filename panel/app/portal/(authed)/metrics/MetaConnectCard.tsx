import { query } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { isMetaOAuthConfigured } from "@/lib/meta/oauth";
import { META_CONNECT_MESSAGES } from "@/lib/meta/oauthState";
import { META_ASSET_TYPE_LABELS, type MetaAssetType } from "@/lib/types/domain";

/**
 * Tarjeta del portal para que el cliente conecte su Facebook / Instagram /
 * cuenta publicitaria con un clic. Solo el titular (owner) puede conectar;
 * en modo "ver como cliente" se muestra pero no deja conectar.
 */
export async function MetaConnectCard({
  clientId,
  isOwner,
  isPreview,
  status,
}: {
  clientId: string;
  isOwner: boolean;
  isPreview: boolean;
  status: string | undefined;
}) {
  const configured = isMetaOAuthConfigured();
  const assets = await query<{ asset_type: MetaAssetType; name: string | null }>(
    `select a.asset_type, a.name from meta_assets a
     join meta_connections c on c.id = a.connection_id
     where a.client_id = $1 and a.active = true and c.status <> 'error'
     order by a.asset_type, a.name`,
    [clientId]
  );
  const msg = status ? META_CONNECT_MESSAGES[status] : null;
  const connected = assets.length > 0;

  if (!configured && !connected && !msg) return null;

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <CardTitle>Facebook e Instagram</CardTitle>
        <p className="mt-1 text-sm text-text-muted">
          {connected
            ? "Tu cuenta está conectada: tus métricas se actualizan solas todos los días."
            : "Conectá tu página de Facebook, tu Instagram y tu cuenta publicitaria para ver tus métricas acá. Solo lectura: no publicamos ni gastamos nada desde esta conexión."}
        </p>
      </div>

      {msg && (
        <p className={`text-sm ${msg.tone === "success" ? "text-success" : msg.tone === "danger" ? "text-danger" : "text-warning"}`}>{msg.text}</p>
      )}

      {connected && (
        <ul className="flex flex-wrap gap-2 text-xs">
          {assets.map((a, i) => (
            <li key={i} className="rounded-full bg-surface-hover px-3 py-1 text-text-primary">
              {META_ASSET_TYPE_LABELS[a.asset_type]}: {a.name ?? "—"}
            </li>
          ))}
        </ul>
      )}

      {configured &&
        (isOwner && !isPreview ? (
          <a
            href="/api/meta/oauth/start?from=portal"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#1877F2] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
            </svg>
            {connected ? "Volver a conectar con Facebook" : "Conectar con Facebook"}
          </a>
        ) : (
          <p className="text-xs text-text-muted">
            {isPreview ? "Modo \"ver como cliente\": el botón de conectar está desactivado." : "Solo el titular de la cuenta puede conectar Facebook e Instagram."}
          </p>
        ))}
    </Card>
  );
}
