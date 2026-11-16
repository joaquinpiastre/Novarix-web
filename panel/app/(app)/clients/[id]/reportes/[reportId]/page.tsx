import { notFound } from "next/navigation";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { queryOne } from "@/lib/db";
import { getMetricsReport } from "@/lib/meta/report";
import { MetricsReportView } from "@/components/meta/MetricsReportView";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils/dates";
import { ReportActions } from "./ReportActions";

export const dynamic = "force-dynamic";

export default async function MetricsReportPage({ params }: { params: { id: string; reportId: string } }) {
  await requireClientAccess(params.id);
  const [report, client] = await Promise.all([
    getMetricsReport(params.id, params.reportId),
    queryOne<{ name: string }>("select name from clients where id = $1", [params.id]),
  ]);
  if (!report || !client) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <ReportActions
        clientId={params.id}
        reportId={report.id}
        shared={report.shared_with_client}
        clientMessage={report.report.client_message ?? ""}
      />
      <MetricsReportView
        report={report.report}
        periodFrom={report.period_from}
        periodTo={report.period_to}
        clientName={client.name}
        showClientMessage
      />
      <Card className="text-xs text-text-muted print:hidden">
        Generado con IA ({report.model}) el {formatDate(report.created_at.slice(0, 10))}.
        {report.team_prompt ? ` Indicaciones del equipo: “${report.team_prompt}”.` : ""} Revisalo antes de compartirlo: la IA puede equivocarse.
      </Card>
    </div>
  );
}
