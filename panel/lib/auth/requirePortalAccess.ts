import "server-only";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import type { Profile } from "@/lib/types/domain";

export interface PortalAccess {
  userId: string;
  profile: Profile;
  clientId: string;
}

export async function requirePortalAccess(): Promise<PortalAccess> {
  const { userId, profile } = await getSessionProfile();
  if (profile.role !== "client" || !profile.client_id) redirect("/dashboard");
  return { userId, profile, clientId: profile.client_id };
}
