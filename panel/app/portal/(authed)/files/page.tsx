import { requireClient } from "@/lib/auth/requireClient";
import { getBrandKit, getClientFiles } from "@/lib/portal/queries";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import { UploadFileForm } from "./UploadFileForm";

export const dynamic = "force-dynamic";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function PortalFilesPage() {
  const { clientId } = await requireClient();
  const [files, brandKit] = await Promise.all([getClientFiles(clientId), getBrandKit(clientId)]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Archivos</h1>
        <p className="text-sm text-text-muted">Kit de marca, entregables y documentos compartidos.</p>
      </div>

      {brandKit && (
        <Card>
          <CardTitle>Kit de marca</CardTitle>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {brandKit.logo_url && (
              <a href={brandKit.logo_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Logo →
              </a>
            )}
            {brandKit.canva_url && (
              <a href={brandKit.canva_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Canva →
              </a>
            )}
            {brandKit.references_url && (
              <a href={brandKit.references_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Referencias →
              </a>
            )}
          </div>
          {brandKit.color_palette && (
            <p className="mt-2 text-xs text-text-muted">Paleta: {brandKit.color_palette}</p>
          )}
        </Card>
      )}

      <Card>
        <CardTitle>Subir un archivo</CardTitle>
        <p className="mt-1 text-xs text-text-muted">Imágenes, PDF o video corto (máx. 25 MB).</p>
        <UploadFileForm />
      </Card>

      <Card>
        <CardTitle>Documentos compartidos</CardTitle>
        {files.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">Sin archivos compartidos todavía.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <a
                    href={`/api/files/client-files/${f.id}`}
                    className="text-sm font-medium text-text-primary hover:text-accent"
                  >
                    {f.filename}
                  </a>
                  <p className="text-xs text-text-muted">
                    {formatDate(f.created_at)} · {formatSize(f.size_bytes)}
                  </p>
                </div>
                <Badge tone={f.direction === "from_client" ? "accent" : "neutral"}>
                  {f.direction === "from_client" ? "Subido por vos" : "Novarix"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
