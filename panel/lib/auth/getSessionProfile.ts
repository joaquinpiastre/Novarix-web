import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { SESSION_COOKIE, getUserIdForSession } from "@/lib/auth/session";
import type { Profile } from "@/lib/types/domain";

export async function getSessionProfile(): Promise<{ userId: string; profile: Profile }> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const userId = await getUserIdForSession(token);
  if (!userId) redirect("/login");

  const profile = await queryOne<Profile>(
    "select id, email, full_name, role, created_at from profiles where id = $1",
    [userId]
  );
  if (!profile) redirect("/login");

  return { userId, profile };
}

export async function requireAdmin(): Promise<{ userId: string; profile: Profile }> {
  const session = await getSessionProfile();
  if (session.profile.role !== "admin") redirect("/dashboard");
  return session;
}
