import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { requireClient } from "@/lib/auth/requireClient";
import { canAccessTicket } from "@/lib/tickets/authorize";
import { queryOne } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage/s3";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, profile } = await getSessionProfile();

  const attachment = await queryOne<{
    storage_key: string;
    filename: string;
    ticket_id: string;
    client_id: string;
    assigned_to: string | null;
  }>(
    `select ta.storage_key, ta.filename, ta.ticket_id, t.client_id, t.assigned_to
     from ticket_attachments ta
     join support_tickets t on t.id = ta.ticket_id
     where ta.id = $1`,
    [params.id]
  );
  if (!attachment) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  if (profile.role === "client") {
    const access = await requireClient();
    if (access.clientId !== attachment.client_id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
  } else {
    const allowed = await canAccessTicket(profile, userId, attachment.client_id, attachment.assigned_to);
    if (!allowed) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const url = await getSignedDownloadUrl(attachment.storage_key, attachment.filename);
  return NextResponse.redirect(url);
}
