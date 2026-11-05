import "server-only";
import { headers } from "next/headers";

export function getClientIp(): string | null {
  const h = headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return h.get("x-real-ip");
}
