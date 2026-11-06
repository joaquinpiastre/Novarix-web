import { requirePortalAccess } from "@/lib/auth/requirePortalAccess";
import { query } from "@/lib/db";
import type { SupportTicket, TechAsset } from "@/lib/types/domain";
import { SupportClient } from "./SupportClient";

export const dynamic = "force-dynamic";

export default async function PortalSupportPage() {
  const { clientId } = await requirePortalAccess();

  const [tickets, techAssets] = await Promise.all([
    query<SupportTicket>(
      "select * from support_tickets where client_id = $1 order by status in ('resolved','closed'), created_at desc",
      [clientId]
    ),
    query<TechAsset>(
      "select * from tech_assets where client_id = $1 and expires_at is not null order by expires_at",
      [clientId]
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Soporte</h1>
        <p className="text-sm text-text-muted">Pedinos ayuda o avisanos si algo no funciona.</p>
      </div>
      <SupportClient tickets={tickets} techAssets={techAssets} />
    </div>
  );
}
