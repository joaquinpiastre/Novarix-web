"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { createSession, verifyPassword, SESSION_COOKIE } from "@/lib/auth/session";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await queryOne<{ id: string; password_hash: string }>(
    "select id, password_hash from profiles where email = $1",
    [email]
  );

  if (!user || !verifyPassword(password, user.password_hash)) {
    redirect(`/login?error=${encodeURIComponent("Usuario o contraseña incorrectos")}`);
  }

  const { token, expiresAt } = await createSession(user.id);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  redirect("/dashboard");
}
