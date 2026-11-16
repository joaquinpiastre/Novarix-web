"use server";

import { revalidatePath } from "next/cache";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { query } from "@/lib/db";
import { aiErrorMessage, isAiConfigured } from "@/lib/ai/client";
import { checkAiLimit } from "@/lib/trends/settings";
import { generateMetricsReport, getMetricsReport } from "@/lib/meta/report";
import { isMetricsPeriod } from "@/lib/meta/periods";

export async function generateMetricsReportAction(clientId: string, period: string, prompt = ""): Promise<{ id?: string; error?: string }> {
  const { userId, profile } = await requireClientAccess(clientId);
  if (!isMetricsPeriod(period)) return { error: "Elegí un período válido." };
  if (!isAiConfigured()) return { error: "La IA todavía no está configurada (falta ANTHROPIC_API_KEY)." };
  const limit = await checkAiLimit(userId, profile.role);
  if (limit) return { error: limit };

  try {
    const res = await generateMetricsReport(clientId, period, { profileId: userId }, String(prompt ?? ""));
    if (res.error) return { error: res.error };
    await recordAudit({
      actorId: userId,
      action: "metrics_report.generate",
      entityType: "metrics_report",
      entityId: res.id ?? null,
      after: { client_id: clientId, period },
      ip: getClientIp(),
    });
    revalidatePath(`/clients/${clientId}`);
    return { id: res.id };
  } catch (err) {
    return { error: aiErrorMessage(err) };
  }
}

export async function setMetricsReportShared(clientId: string, reportId: string, shared: boolean): Promise<{ error?: string }> {
  const { userId } = await requireClientAccess(clientId);
  const report = await getMetricsReport(clientId, reportId);
  if (!report) return { error: "No se encontró el reporte." };
  await query(
    "update metrics_reports set shared_with_client = $3, shared_at = case when $3 then now() else null end where id = $1 and client_id = $2",
    [reportId, clientId, shared]
  );
  await recordAudit({
    actorId: userId,
    action: shared ? "metrics_report.share" : "metrics_report.unshare",
    entityType: "metrics_report",
    entityId: reportId,
    after: { client_id: clientId },
    ip: getClientIp(),
  });
  revalidatePath(`/clients/${clientId}/reportes/${reportId}`);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/portal/reports");
  return {};
}

export async function deleteMetricsReport(clientId: string, reportId: string): Promise<{ error?: string }> {
  const { userId } = await requireClientAccess(clientId);
  const report = await getMetricsReport(clientId, reportId);
  if (!report) return { error: "No se encontró el reporte." };
  await query("delete from metrics_reports where id = $1 and client_id = $2", [reportId, clientId]);
  await recordAudit({
    actorId: userId,
    action: "metrics_report.delete",
    entityType: "metrics_report",
    entityId: reportId,
    before: { client_id: clientId, title: report.title },
    ip: getClientIp(),
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/portal/reports");
  return {};
}
