import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { queryOne } from "@/lib/db";
import { verifySignedToken } from "./signedToken";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import type { ClientPortalRole, Profile } from "@/lib/types/domain";

export const ADMIN_PREVIEW_COOKIE = "panel_view_as_client";
export const ADMIN_PREVIEW_TTL_MS = 30 * 60 * 1000;

export interface ClientAccessContext {
  userId: string;
  profile: Profile;
  clientId: string;
  clientRole: ClientPortalRole;
  /** admin/marketing_admin viendo el portal en modo "ver como cliente" -- de solo lectura. */
  isAdminPreview: boolean;
}

/**
 * Unico punto de entrada para todo lo que lee/escribe datos del portal de
 * clientes. El clientId SIEMPRE sale de acá (de la sesión + client_users,
 * o del cookie firmado de preview admin) -- nunca de un param, query string
 * o campo de formulario. Toda query del portal recibe clientId desde el
 * resultado de esta función.
 */
export async function requireClient(): Promise<ClientAccessContext> {
  const { userId, profile } = await getSessionProfile();

  if (profile.role === "client") {
    const membership = await queryOne<{ client_id: string; client_role: string }>(
      `select client_id, client_role::text as client_role from client_users
       where profile_id = $1 and active = true`,
      [userId]
    );
    if (!membership) redirect("/portal/login");
    return {
      userId,
      profile,
      clientId: membership.client_id,
      clientRole: membership.client_role as ClientPortalRole,
      isAdminPreview: false,
    };
  }

  if (profile.role === "admin" || profile.role === "marketing_admin") {
    const token = cookies().get(ADMIN_PREVIEW_COOKIE)?.value;
    const payload = verifySignedToken(token);
    if (payload) {
      const [adminId, clientId] = payload.split(":");
      if (adminId === userId && clientId) {
        await recordAudit({
          actorId: userId,
          action: "portal.admin_preview_access",
          entityType: "client",
          entityId: clientId,
          ip: getClientIp(),
        });
        return { userId, profile, clientId, clientRole: "owner", isAdminPreview: true };
      }
    }
  }

  redirect("/dashboard");
}

/** Para server actions que escriben datos: bloquea si está en modo preview de solo lectura. */
export function assertNotPreview(access: ClientAccessContext): { error: string } | null {
  if (access.isAdminPreview) {
    return { error: "Estás viendo esto en modo \"ver como cliente\" (solo lectura)." };
  }
  return null;
}
