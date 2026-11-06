import "server-only";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { can } from "@/lib/auth/permissions";
import { queryOne } from "@/lib/db";
import type { Profile } from "@/lib/types/domain";

export interface ClientAccess {
  userId: string;
  profile: Profile;
  /** true = admin/marketing_admin, ve y edita todo del cliente (datos, servicios, equipo).
   *  false = acceso acotado: marketing asignado a este cliente puntual via client_team,
   *  solo ve lo relacionado a marketing/contenido de este cliente. */
  full: boolean;
}

/**
 * Gate de acceso a un cliente puntual (Cliente 360 y todo lo que cuelga de
 * ahi: plan de marketing, calendario de contenido, checklist). No existia en
 * la Fase 1 original -- cualquier perfil autenticado podia ver la ficha de
 * cualquier cliente por URL. `programmer` no tiene acceso a clientes todavia
 * (llega en la Fase 5, con sistemas/proyectos).
 */
export async function requireClientAccess(clientId: string): Promise<ClientAccess> {
  const { userId, profile } = await getSessionProfile();

  if (can(profile, "clients.manage")) {
    return { userId, profile, full: true };
  }

  if (profile.role === "marketing") {
    const row = await queryOne(
      "select 1 from client_team where client_id = $1 and profile_id = $2",
      [clientId, userId]
    );
    if (row) return { userId, profile, full: false };
  }

  redirect("/dashboard");
}
