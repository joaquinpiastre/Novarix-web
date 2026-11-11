import { query, queryOne } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { clientAccessError, requireScopedAccess, selectableClients } from "@/lib/trends/access";
import { DEFAULT_MAX_UPLOAD_MB, currentMonthFolder, sanitizeFolder } from "@/lib/library/files";
import { ClientPicker } from "../diagnostico/ClientPicker";
import { LibraryView, type LibraryFile } from "./LibraryView";

export const dynamic = "force-dynamic";

export default async function LibraryPage({ searchParams }: { searchParams: { client?: string; folder?: string; q?: string } }) {
  const access = await requireScopedAccess("library.use");
  const clients = await selectableClients(access);
  const clientId =
    searchParams.client && clients.some((c) => c.id === searchParams.client)
      ? searchParams.client
      : clients.length === 1
        ? clients[0].id
        : null;

  const header = (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Biblioteca de contenido</h1>
      <p className="text-sm text-text-muted">Fotos, videos y diseños de cada cliente, en la nube del panel. Subí desde la compu o el celular.</p>
    </div>
  );

  if (!clientId || clientAccessError(access, clientId)) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">Elegí un cliente para ver y subir su contenido.</p>
          <ClientPicker clients={clients} value="" />
        </Card>
      </div>
    );
  }

  const folder = sanitizeFolder(searchParams.folder) ?? "";
  const q = (searchParams.q ?? "").trim().slice(0, 100);

  const [folders, files, items, totals] = await Promise.all([
    query<{ folder: string; files: number; bytes: string }>(
      `select folder, count(*)::int as files, sum(size_bytes)::text as bytes from content_files
       where client_id = $1 and status = 'ready' group by folder order by folder desc`,
      [clientId]
    ),
    query<LibraryFile & { size_bytes: string }>(
      `select f.id, f.folder, f.filename, f.content_type, f.size_bytes::text, f.notes, f.created_at, f.content_item_id,
              p.full_name as uploader, ci.title as item_title
       from content_files f
       left join profiles p on p.id = f.uploaded_by
       left join content_items ci on ci.id = f.content_item_id
       where f.client_id = $1 and f.status = 'ready'
         and (case when $3 <> '' then f.filename ilike '%' || $3 || '%' else f.folder = $2 end)
       order by f.created_at desc limit 500`,
      [clientId, folder, q]
    ),
    query<{ id: string; title: string; status: string; recording_at: string | null }>(
      `select id, title, status::text, recording_at from content_items where client_id = $1
       order by coalesce(recording_at, scheduled_at, created_at) desc limit 300`,
      [clientId]
    ),
    queryOne<{ bytes: string | null; files: number }>(
      "select sum(size_bytes)::text as bytes, count(*)::int as files from content_files where client_id = $1 and status = 'ready'",
      [clientId]
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {header}
      <ClientPicker clients={clients} value={clientId} />
      <LibraryView
        key={`${clientId}:${folder}:${q}`}
        clientId={clientId}
        folder={folder}
        query={q}
        defaultFolder={folder || currentMonthFolder()}
        folders={folders.map((f) => ({ folder: f.folder, files: f.files, bytes: Number(f.bytes ?? 0) }))}
        files={files.map((f) => ({ ...f, size_bytes: Number(f.size_bytes) }))}
        contentItems={items}
        totalBytes={Number(totals?.bytes ?? 0)}
        totalFiles={totals?.files ?? 0}
        maxUploadMb={Number(process.env.CONTENT_MAX_UPLOAD_MB ?? DEFAULT_MAX_UPLOAD_MB)}
      />
    </div>
  );
}
