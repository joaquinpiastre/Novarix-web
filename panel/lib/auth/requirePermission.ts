import "server-only";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { can, type Permission } from "@/lib/auth/permissions";
import type { Profile } from "@/lib/types/domain";

/**
 * Igual que getSessionProfile(), pero además exige un permiso puntual.
 * Reemplaza a requireAdmin() en el código de features; requireAdmin() sigue
 * existiendo en getSessionProfile.ts como primitiva de bajo nivel.
 *
 * Vive separado de permissions.ts a propósito: este archivo tira de
 * next/headers (vía getSessionProfile), y permissions.ts lo importan
 * también componentes de cliente (components/nav/links.ts) que no pueden
 * cargar next/headers ni transitivamente.
 */
export async function requirePermission(
  permission: Permission
): Promise<{ userId: string; profile: Profile }> {
  const session = await getSessionProfile();
  if (!can(session.profile, permission)) redirect("/dashboard");
  return session;
}

/** Igual que requirePermission(), pero alcanza con tener cualquiera de los permisos listados. */
export async function requireAnyPermission(
  permissions: Permission[]
): Promise<{ userId: string; profile: Profile }> {
  const session = await getSessionProfile();
  if (!permissions.some((p) => can(session.profile, p))) redirect("/dashboard");
  return session;
}
