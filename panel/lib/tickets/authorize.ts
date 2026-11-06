import "server-only";
import { queryOne } from "@/lib/db";
import { can } from "@/lib/auth/permissions";
import type { Profile } from "@/lib/types/domain";

/**
 * admin/marketing_admin (tickets.manage_all) ven todo. programmer/marketing
 * solo ven tickets de clientes donde estan en client_team, o tickets
 * asignados a ellos directamente -- igual alcance que scopeTicketsFor(),
 * pero a nivel de un ticket puntual (para el detalle y la descarga de
 * adjuntos, no solo el listado).
 */
export async function canAccessTicket(
  profile: Profile,
  userId: string,
  ticketClientId: string,
  assignedTo: string | null
): Promise<boolean> {
  if (can(profile, "tickets.manage_all")) return true;
  if (assignedTo === userId) return true;
  const row = await queryOne(
    "select 1 from client_team where client_id = $1 and profile_id = $2",
    [ticketClientId, userId]
  );
  return Boolean(row);
}
