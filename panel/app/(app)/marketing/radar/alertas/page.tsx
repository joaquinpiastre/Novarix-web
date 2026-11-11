import { query } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { requireTrendsAccess } from "@/lib/trends/access";
import { RadarHeader } from "../_components/RadarNav";
import { AlertRow } from "./AlertRow";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const access = await requireTrendsAccess();
  const alerts = await query<{
    id: string;
    name: string;
    prompt: string;
    every_days: number;
    min_score: number;
    active: boolean;
    last_run_at: string | null;
    client_name: string | null;
    owner: string;
    last_search_id: string | null;
  }>(
    `select s.id, s.name, s.prompt, s.every_days, s.min_score, s.active, s.last_run_at, c.name as client_name, p.full_name as owner,
            (select t.id from trend_searches t where t.saved_search_id = s.id order by t.created_at desc limit 1) as last_search_id
     from saved_searches s
     left join clients c on c.id = s.client_id
     join profiles p on p.id = s.profile_id
     where $1::boolean or s.profile_id = $2
     order by s.created_at desc`,
    [access.full, access.userId]
  );

  return (
    <div className="flex flex-col gap-6">
      <RadarHeader
        active="/marketing/radar/alertas"
        title="Alertas del Radar"
        subtitle="Búsquedas guardadas que se repiten solas cada X días y te avisan solo si aparecen videos nuevos por encima del score."
      />
      {alerts.length === 0 ? (
        <Card className="text-sm text-text-muted">No hay alertas. Corré una búsqueda y tocá “Guardar como alerta”.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </div>
      )}
    </div>
  );
}
