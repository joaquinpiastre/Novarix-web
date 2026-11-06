import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { requireClient } from "@/lib/auth/requireClient";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { queryOne } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage/s3";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { profile } = await getSessionProfile();

  const file = await queryOne<{ storage_key: string; filename: string; client_id: string }>(
    "select storage_key, filename, client_id from client_files where id = $1",
    [params.id]
  );
  if (!file) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  if (profile.role === "client") {
    const access = await requireClient();
    if (access.clientId !== file.client_id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
  } else {
    await requireClientAccess(file.client_id);
  }

  const url = await getSignedDownloadUrl(file.storage_key, file.filename);
  return NextResponse.redirect(url);
}
