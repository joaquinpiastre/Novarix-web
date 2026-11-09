import Link from "next/link";
import { requirePermission } from "@/lib/auth/requirePermission";
import { query } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

interface ExpiringAssetRow {
  id: string;
  client_id: string;
  client_name: string;
  label: string;
  asset_type: string;
  expires_at: string;
}

export default async function SystemsDashboardPage() {
  await requirePermission("systems.manage");

  const expiringAssets = await query<ExpiringAssetRow>(`
    select a.id, a.client_id, c.name as client_name, a.label, a.asset_type::text, a.expires_at::text
    from tech_assets a
    join clients c on c.id = a.client_id
    where a.expires_at is not null and a.expires_at <= current_date + interval '60 days'
    order by a.expires_at
  `);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Sistemas — vista general</h1>
          <p className="text-sm text-text-muted">Vencimientos próximos de todos los clientes.</p>
        </div>
        <Link href="/tickets" className="text-sm text-accent hover:underline">
          Ver tickets →
        </Link>
      </div>

      <Card>
        <CardTitle>Vencimientos en los próximos 60 días ({expiringAssets.length})</CardTitle>
        {expiringAssets.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Sin vencimientos próximos.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {expiringAssets.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <Link href={`/clients/${a.client_id}`} className="text-sm font-medium text-text-primary hover:text-accent">
                    {a.label}
                  </Link>
                  <p className="text-xs text-text-muted">{a.client_name}</p>
                </div>
                <Badge tone={new Date(a.expires_at) < new Date() ? "danger" : "warning"}>
                  Vence {formatDate(a.expires_at)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
