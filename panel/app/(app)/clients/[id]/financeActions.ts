"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth/requirePermission";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";

export interface ActionState {
  error?: string;
}

// Ambas acciones son admin-only (payments_in.manage) a proposito: la
// rentabilidad por cliente expone cuanto cuesta internamente cada cuenta,
// algo que ni marketing_admin deberia ver.

export async function updateDirectCosts(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { userId: actorId } = await requirePermission("payments_in.manage");
  const client_id = String(formData.get("client_id") ?? "");
  if (!client_id) return { error: "Falta el cliente." };

  const raw = String(formData.get("monthly_direct_costs") ?? "").trim();
  const monthly_direct_costs = raw ? Number(raw) : null;

  await query("update clients set monthly_direct_costs = $1 where id = $2", [
    monthly_direct_costs,
    client_id,
  ]);

  await recordAudit({
    actorId,
    action: "clients.update_direct_costs",
    entityType: "client",
    entityId: client_id,
    after: { monthly_direct_costs },
    ip: getClientIp(),
  });

  revalidatePath(`/clients/${client_id}`);
  revalidatePath("/finance");
  return {};
}

export async function updateTeamCostAllocation(formData: FormData): Promise<void> {
  const { userId: actorId } = await requirePermission("payments_in.manage");
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  if (!id || !client_id) return;

  const raw = String(formData.get("monthly_cost_allocation") ?? "").trim();
  const monthly_cost_allocation = raw ? Number(raw) : null;

  await query("update client_team set monthly_cost_allocation = $1 where id = $2", [
    monthly_cost_allocation,
    id,
  ]);

  await recordAudit({
    actorId,
    action: "client_team.update_cost_allocation",
    entityType: "client_team",
    entityId: id,
    after: { client_id, monthly_cost_allocation },
    ip: getClientIp(),
  });

  revalidatePath(`/clients/${client_id}`);
  revalidatePath("/finance");
}
