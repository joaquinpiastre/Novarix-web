import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { requireClient } from "@/lib/auth/requireClient";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { queryOne } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage/s3";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { profile } = await getSessionProfile();

  const report = await queryOne<{ storage_key: string; filename: string; client_id: string }>(
    "select storage_key, filename, client_id from client_reports where id = $1",
    [params.id]
  );
  if (!report) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  if (profile.role === "client") {
    const access = await requireClient();
    if (access.clientId !== report.client_id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
  } else {
    await requireClientAccess(report.client_id);
  }

  const url = await getSignedDownloadUrl(report.storage_key, report.filename);
  return NextResponse.redirect(url);
}
