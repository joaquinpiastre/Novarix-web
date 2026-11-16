"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Printer, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteMetricsReport, setMetricsReportShared } from "../../metricsReportActions";

export function ReportActions({
  clientId,
  reportId,
  shared,
  clientMessage,
}: {
  clientId: string;
  reportId: string;
  shared: boolean;
  clientMessage: string;
}) {
  const router = useRouter();
  const [pending, run] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/clients/${clientId}?tab=metricas`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-text-muted hover:bg-surface-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a métricas
        </Link>
        <div className="flex-1" />
        <Button variant="secondary" onClick={() => window.print()}>
          <span className="inline-flex items-center gap-1.5">
            <Printer className="h-4 w-4" /> Descargar PDF
          </span>
        </Button>
        {clientMessage && (
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(clientMessage);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setError("No se pudo copiar. Seleccioná el texto del mensaje y copialo a mano.");
              }
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Copy className="h-4 w-4" /> {copied ? "¡Copiado!" : "Copiar mensaje para el cliente"}
            </span>
          </Button>
        )}
        <Button
          variant={shared ? "secondary" : "primary"}
          disabled={pending}
          onClick={() =>
            run(async () => {
              setError(null);
              const res = await setMetricsReportShared(clientId, reportId, !shared);
              if (res.error) setError(res.error);
              else router.refresh();
            })
          }
        >
          <span className="inline-flex items-center gap-1.5">
            <Share2 className="h-4 w-4" /> {shared ? "Quitar del portal" : "Compartir en el portal del cliente"}
          </span>
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!confirm("¿Borrar este reporte? No se puede deshacer.")) return;
            run(async () => {
              const res = await deleteMetricsReport(clientId, reportId);
              if (res.error) setError(res.error);
              else router.push(`/clients/${clientId}?tab=metricas`);
            });
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Trash2 className="h-4 w-4" /> Borrar
          </span>
        </Button>
      </div>
      {shared && <p className="text-xs text-success">El cliente lo ve en su portal, en la sección Reportes.</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
