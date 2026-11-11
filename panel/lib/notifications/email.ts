import "server-only";
import { log } from "@/lib/log";

// Resend vía su API HTTP directa (sin el SDK, es un solo POST) -- inerte
// sin RESEND_API_KEY, no rompe nada. Activarlo: crear cuenta en resend.com,
// verificar el dominio de envío, y cargar RESEND_API_KEY + RESEND_FROM.
/** Devuelve true si el email salio (false si Resend no esta configurado o fallo). */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      log.error("resend send failed", { status: res.status, body: await res.text() });
      return false;
    }
    return true;
  } catch (err) {
    log.error("resend send threw", { err: String(err) });
    return false;
  }
}
