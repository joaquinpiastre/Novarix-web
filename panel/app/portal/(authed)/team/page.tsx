import { requireClient } from "@/lib/auth/requireClient";
import { getPortalTeam } from "@/lib/portal/queries";
import { Card, CardTitle } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default async function PortalTeamPage() {
  const { clientId } = await requireClient();
  const team = await getPortalTeam(clientId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Mi equipo Novarix</h1>
        <p className="text-sm text-text-muted">Quién te atiende en cada servicio.</p>
      </div>

      <Card>
        {team.length === 0 ? (
          <p className="text-sm text-text-muted">Todavía no se asignó un equipo a tu cuenta.</p>
        ) : (
          <ul className="divide-y divide-border">
            {team.map((t) => (
              <li key={t.profile_id} className="flex items-center gap-3 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                  {initials(t.full_name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{t.full_name}</p>
                  <p className="text-xs text-text-muted">{t.role_on_account || "Equipo Novarix"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
