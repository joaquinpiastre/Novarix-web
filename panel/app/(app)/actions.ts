"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { destroySession, SESSION_COOKIE } from "@/lib/auth/session";

export async function signOut() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}
