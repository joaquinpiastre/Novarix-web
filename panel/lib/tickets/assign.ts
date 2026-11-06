import "server-only";
import { queryOne } from "@/lib/db";
import type { TicketType } from "@/lib/types/domain";

/**
 * Auto-asignacion sugerida por tipo de ticket:
 * - facturacion -> un admin
 * - soporte_tecnico -> el responsable del proyecto relacionado, o un
 *   programmer del equipo asignado al cliente
 * - pedido_contenido/pedido_cambio -> alguien de marketing del equipo
 *   asignado al cliente
 * - reclamo/consulta -> sin auto-asignar, alguien lo revisa a mano
 */
export async function suggestAssignee(
  clientId: string,
  ticketType: TicketType,
  relatedProjectId: string | null
): Promise<string | null> {
  if (ticketType === "facturacion") {
    const admin = await queryOne<{ id: string }>(
      "select id from profiles where role = 'admin' order by created_at limit 1"
    );
    return admin?.id ?? null;
  }

  if (ticketType === "soporte_tecnico") {
    if (relatedProjectId) {
      const project = await queryOne<{ owner_id: string | null }>(
        "select owner_id from projects where id = $1",
        [relatedProjectId]
      );
      if (project?.owner_id) return project.owner_id;
    }
    const programmer = await queryOne<{ profile_id: string }>(
      `select ct.profile_id from client_team ct join profiles p on p.id = ct.profile_id
       where ct.client_id = $1 and p.role = 'programmer' limit 1`,
      [clientId]
    );
    return programmer?.profile_id ?? null;
  }

  if (ticketType === "pedido_contenido" || ticketType === "pedido_cambio") {
    const marketer = await queryOne<{ profile_id: string }>(
      `select ct.profile_id from client_team ct join profiles p on p.id = ct.profile_id
       where ct.client_id = $1 and p.role in ('marketing', 'marketing_admin') limit 1`,
      [clientId]
    );
    return marketer?.profile_id ?? null;
  }

  return null;
}
