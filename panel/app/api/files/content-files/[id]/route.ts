import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { requireClient } from "@/lib/auth/requireClient";
import { can } from "@/lib/auth/permissions";
import { queryOne } from "@/lib/db";
import { getSignedDownloadUrl, getSignedInlineUrl } from "@/lib/storage/s3";
import { isInlinePreviewable } from "@/lib/library/files";

export const dynamic = "force-dynamic";

/**
 * Ver (?inline=1) o descargar un archivo de la biblioteca.
 * - Equipo: con library.use y acceso a ese cliente (marketing: solo sus clientes).
 * - Cliente (portal): solo archivos de SU empresa que estén vinculados a una
 *   pieza del calendario (lo que el equipo decidió mostrarle).
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  const { userId, profile } = await getSessionProfile();

  const file = await queryOne<{ storage_key: string; filename: string; content_type: string; client_id: string; content_item_id: string | null; status: string }>(
    "select storage_key, filename, content_type, client_id, content_item_id, status from content_files where id = $1",
    [params.id]
  );
  if (!file || file.status !== "ready") return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  if (profile.role === "client") {
    const access = await requireClient();
    if (access.clientId !== file.client_id || !file.content_item_id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
  } else {
    if (!can(profile, "library.use")) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    if (!can(profile, "clients.manage")) {
      const onTeam = await queryOne("select 1 from client_team where client_id = $1 and profile_id = $2", [file.client_id, userId]);
      if (!onTeam) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
  }

  const inline = request.nextUrl.searchParams.get("inline") === "1" && isInlinePreviewable(file.content_type);
  const url = inline
    ? await getSignedInlineUrl(file.storage_key, file.filename, file.content_type)
    : await getSignedDownloadUrl(file.storage_key, file.filename);
  const res = NextResponse.redirect(url);
  // La URL firmada dura 1 hora: el navegador puede reusar la redireccion un rato para las vistas previas.
  res.headers.set("Cache-Control", inline ? "private, max-age=1800" : "no-store");
  return res;
}
