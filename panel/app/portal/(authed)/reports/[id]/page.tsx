import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireClient } from "@/lib/auth/requireClient";
import { queryOne } from "@/lib/db";
import { getMetricsReport } from "@/lib/meta/report";
import { MetricsReportView } from "@/components/meta/MetricsReportView";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

// Análisis de resultados que la agencia compartió. El clientId sale de la
// sesión: un cliente nunca puede abrir el reporte de otro, y los no
// compartidos no se ven.
export default async function PortalMetricsReportPage({ params }: { params: { id: string } }) {
  const { clientId } = await requireClient();
  const [report, client] = await Promise.all([
    getMetricsReport(clientId, params.id),
    queryOne<{ name: string }>("select name from clients where id = $1", [clientId]),
  ]);
  if (!report || !report.shared_with_client || !client) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href="/portal/reports" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" /> Reportes
        </Link>
        <PrintButton />
      </div>
      <MetricsReportView report={report.report} periodFrom={report.period_from} periodTo={report.period_to} clientName={client.name} />
    </div>
  );
}
