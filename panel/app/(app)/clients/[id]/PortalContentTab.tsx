"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatMonthLabel } from "@/lib/utils/dates";
import type { ClientFile, ClientReport } from "@/lib/types/domain";
import {
  deleteClientFile,
  deleteReport,
  publishReport,
  shareFile,
  type ActionState,
} from "./portalContentActions";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

function ReportsCard({ clientId, reports }: { clientId: string; reports: ClientReport[] }) {
  const [state, formAction] = useFormState<ActionState, FormData>(publishReport, {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardTitle>Reportes publicados</CardTitle>
      <p className="mt-1 text-xs text-text-muted">El cliente los ve y descarga en /portal/reports y recibe un aviso.</p>
      <form
        ref={formRef}
        action={async (fd) => {
          await formAction(fd);
          formRef.current?.reset();
        }}
        className="mt-4 grid gap-3 rounded-lg border border-border bg-surface-hover p-4 sm:grid-cols-2"
      >
        <input type="hidden" name="client_id" value={clientId} />
        <Input label="Título" name="title" placeholder="Reporte mensual" required />
        <Input label="Mes (opcional)" name="period_month" type="month" />
        <input type="file" name="file" accept="application/pdf" required className="text-sm text-text-muted sm:col-span-2" />
        {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        {state.ok && <p className="text-sm text-success sm:col-span-2">Reporte publicado.</p>}
        <div className="sm:col-span-2">
          <SubmitButton label="Publicar reporte" pendingLabel="Subiendo…" />
        </div>
      </form>
      <ul className="mt-4 divide-y divide-border">
        {reports.length === 0 && <p className="text-sm text-text-muted">Sin reportes publicados.</p>}
        {reports.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2">
            <a href={`/api/files/client-reports/${r.id}`} className="text-sm text-text-primary hover:text-accent">
              {r.title}
              <span className="ml-2 text-xs text-text-muted">
                {r.period_month ? formatMonthLabel(r.period_month) : formatDate(r.created_at)}
              </span>
            </a>
            <form action={deleteReport}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="client_id" value={clientId} />
              <button type="submit" aria-label="Eliminar" className="text-text-muted hover:text-danger">
                <Trash2 size={14} />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FilesCard({ clientId, files }: { clientId: string; files: ClientFile[] }) {
  const [state, formAction] = useFormState<ActionState, FormData>(shareFile, {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardTitle>Archivos compartidos</CardTitle>
      <p className="mt-1 text-xs text-text-muted">Entregables y documentos — incluye lo que sube el cliente.</p>
      <form
        ref={formRef}
        action={async (fd) => {
          await formAction(fd);
          formRef.current?.reset();
        }}
        className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-surface-hover p-4"
      >
        <input type="hidden" name="client_id" value={clientId} />
        <input type="file" name="file" required className="text-sm text-text-muted" />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.ok && <p className="text-sm text-success">Archivo compartido.</p>}
        <div>
          <SubmitButton label="Compartir con el cliente" pendingLabel="Subiendo…" />
        </div>
      </form>
      <ul className="mt-4 divide-y divide-border">
        {files.length === 0 && <p className="text-sm text-text-muted">Sin archivos todavía.</p>}
        {files.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 py-2">
            <a href={`/api/files/client-files/${f.id}`} className="text-sm text-text-primary hover:text-accent">
              {f.filename}
            </a>
            <div className="flex items-center gap-2">
              <Badge tone={f.direction === "from_client" ? "accent" : "neutral"}>
                {f.direction === "from_client" ? "Del cliente" : "Novarix"}
              </Badge>
              <form action={deleteClientFile}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="client_id" value={clientId} />
                <button type="submit" aria-label="Eliminar" className="text-text-muted hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function PortalContentTab({
  clientId,
  reports,
  files,
}: {
  clientId: string;
  reports: ClientReport[];
  files: ClientFile[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ReportsCard clientId={clientId} reports={reports} />
      <FilesCard clientId={clientId} files={files} />
    </div>
  );
}
