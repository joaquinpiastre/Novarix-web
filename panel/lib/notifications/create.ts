import "server-only";
import { query } from "@/lib/db";
import { sendEmail } from "./email";

export async function notify(
  profileId: string,
  kind: string,
  title: string,
  body?: string,
  link?: string
): Promise<void> {
  await query(
    "insert into notifications (profile_id, kind, title, body, link) values ($1,$2,$3,$4,$5)",
    [profileId, kind, title, body ?? null, link ?? null]
  );

  // Best-effort: no interrumpe el flujo si falla o si Resend no esta
  // configurado (sendEmail() es un no-op sin RESEND_API_KEY).
  const profile = await query<{ email: string }>("select email from profiles where id = $1", [
    profileId,
  ]);
  if (profile[0]) {
    await sendEmail(
      profile[0].email,
      title,
      `<p>${body ?? title}</p>${link ? `<p><a href="https://panel.novarix.agency${link}">Ver en el panel</a></p>` : ""}`
    );
  }
}

export async function notifyMany(
  profileIds: string[],
  kind: string,
  title: string,
  body?: string,
  link?: string
): Promise<void> {
  await Promise.all(profileIds.map((id) => notify(id, kind, title, body, link)));
}
