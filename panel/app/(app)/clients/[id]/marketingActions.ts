"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import { CHECKLIST_ITEMS } from "@/lib/marketing/checklist";
import type {
  CampaignStatus,
  ContentStatus,
  Deliverable,
  MarketingPlanStatus,
} from "@/lib/types/domain";

export interface ActionState {
  error?: string;
}

// ===== Plan de marketing =====

export async function createMarketingPlan(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const client_id = String(formData.get("client_id") ?? "");
  const { userId: actorId } = await requireClientAccess(client_id);

  const period_start = String(formData.get("period_start") ?? "");
  const period_end = String(formData.get("period_end") ?? "");
  if (!period_start || !period_end) return { error: "Completá el período del plan." };

  const objectives = String(formData.get("objectives") ?? "").trim() || null;
  const target_audience = String(formData.get("target_audience") ?? "").trim() || null;
  const value_proposition = String(formData.get("value_proposition") ?? "").trim() || null;
  const budgetRaw = String(formData.get("budget_ads") ?? "").trim();
  const budget_ads = budgetRaw ? Number(budgetRaw) : null;
  const channels = String(formData.get("channels") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const deliverables: Deliverable[] = [];
  const formats = formData.getAll("deliverable_format");
  const counts = formData.getAll("deliverable_committed");
  formats.forEach((format, i) => {
    const committed = Number(counts[i] ?? 0);
    if (String(format).trim() && committed > 0) {
      deliverables.push({ format: String(format).trim(), committed });
    }
  });

  const [row] = await query<{ id: string }>(
    `insert into marketing_plans
       (client_id, period_start, period_end, objectives, target_audience, value_proposition, budget_ads, channels, deliverables, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
    [
      client_id,
      period_start,
      period_end,
      objectives,
      target_audience,
      value_proposition,
      budget_ads,
      channels,
      JSON.stringify(deliverables),
      actorId,
    ]
  );

  await recordAudit({
    actorId,
    action: "marketing_plans.create",
    entityType: "marketing_plan",
    entityId: row.id,
    after: { client_id, period_start, period_end },
    ip: getClientIp(),
  });

  revalidatePath(`/clients/${client_id}`);
  return {};
}

export async function updateMarketingPlanStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const status = String(formData.get("status") ?? "") as MarketingPlanStatus;
  const { userId: actorId } = await requireClientAccess(client_id);
  if (!id || !status) return;

  const approving = status === "approved";
  await query(
    `update marketing_plans set status = $1, updated_at = now()${
      approving ? ", approved_by = $3, approved_at = now()" : ""
    } where id = $2`,
    approving ? [status, id, actorId] : [status, id]
  );

  await recordAudit({
    actorId,
    action: "marketing_plans.status",
    entityType: "marketing_plan",
    entityId: id,
    after: { status },
    ip: getClientIp(),
  });
  revalidatePath(`/clients/${client_id}`);
}

// ===== Checklist =====

export async function toggleChecklistItem(formData: FormData): Promise<void> {
  const client_id = String(formData.get("client_id") ?? "");
  const item_key = String(formData.get("item_key") ?? "");
  const completed = formData.get("completed") === "true";
  const { userId: actorId } = await requireClientAccess(client_id);
  if (!CHECKLIST_ITEMS.some((i) => i.key === item_key)) return;

  await query(
    `insert into client_checklist (client_id, item_key, completed, completed_at, updated_by, updated_at)
     values ($1, $2, $3, case when $3 then now() else null end, $4, now())
     on conflict (client_id, item_key)
     do update set completed = $3, completed_at = case when $3 then now() else null end, updated_by = $4, updated_at = now()`,
    [client_id, item_key, completed, actorId]
  );

  revalidatePath(`/clients/${client_id}`);
}

// ===== Contenido =====

export async function createContentItem(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const client_id = String(formData.get("client_id") ?? "");
  const { userId: actorId } = await requireClientAccess(client_id);

  const title = String(formData.get("title") ?? "").trim();
  const channel = String(formData.get("channel") ?? "").trim();
  const format = String(formData.get("format") ?? "").trim();
  if (!title || !channel || !format) return { error: "Completá título, canal y formato." };

  const copy = String(formData.get("copy") ?? "").trim() || null;
  const attachment_url = String(formData.get("attachment_url") ?? "").trim() || null;
  const scheduledRaw = String(formData.get("scheduled_at") ?? "").trim();
  const scheduled_at = scheduledRaw ? new Date(scheduledRaw).toISOString() : null;
  const assigned_to = String(formData.get("assigned_to") ?? "") || null;

  await query(
    `insert into content_items (client_id, channel, format, title, copy, attachment_url, scheduled_at, assigned_to, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [client_id, channel, format, title, copy, attachment_url, scheduled_at, assigned_to, actorId]
  );

  revalidatePath(`/clients/${client_id}`);
  return {};
}

export async function updateContentStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const status = String(formData.get("status") ?? "") as ContentStatus;
  await requireClientAccess(client_id);
  if (!id || !status) return;

  const setPublished = status === "publicado";
  await query(
    `update content_items set status = $1, updated_at = now()${
      setPublished ? ", published_at = coalesce(published_at, now())" : ""
    } where id = $2`,
    [status, id]
  );

  revalidatePath(`/clients/${client_id}`);
}

export async function deleteContentItem(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  await requireClientAccess(client_id);
  if (!id) return;
  await query("delete from content_items where id = $1", [id]);
  revalidatePath(`/clients/${client_id}`);
}

// ===== Campañas =====

export async function createCampaign(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const client_id = String(formData.get("client_id") ?? "");
  const { userId: actorId } = await requireClientAccess(client_id);

  const name = String(formData.get("name") ?? "").trim();
  const channel = String(formData.get("channel") ?? "").trim();
  if (!name || !channel) return { error: "Completá nombre y canal." };

  const objective = String(formData.get("objective") ?? "").trim() || null;
  const start_date = String(formData.get("start_date") ?? "") || null;
  const end_date = String(formData.get("end_date") ?? "") || null;
  const budgetRaw = String(formData.get("budget") ?? "").trim();
  const budget = budgetRaw ? Number(budgetRaw) : null;

  await query(
    `insert into campaigns (client_id, name, objective, channel, start_date, end_date, budget, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [client_id, name, objective, channel, start_date, end_date, budget, actorId]
  );

  revalidatePath(`/clients/${client_id}`);
  return {};
}

export async function updateCampaignStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const client_id = String(formData.get("client_id") ?? "");
  const status = String(formData.get("status") ?? "") as CampaignStatus;
  await requireClientAccess(client_id);
  if (!id || !status) return;
  await query("update campaigns set status = $1 where id = $2", [status, id]);
  revalidatePath(`/clients/${client_id}`);
}

// ===== Kit de marca =====

export async function saveBrandKit(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const client_id = String(formData.get("client_id") ?? "");
  await requireClientAccess(client_id);

  const logo_url = String(formData.get("logo_url") ?? "").trim() || null;
  const color_palette = String(formData.get("color_palette") ?? "").trim() || null;
  const fonts = String(formData.get("fonts") ?? "").trim() || null;
  const tone_of_voice = String(formData.get("tone_of_voice") ?? "").trim() || null;
  const references_url = String(formData.get("references_url") ?? "").trim() || null;
  const canva_url = String(formData.get("canva_url") ?? "").trim() || null;

  await query(
    `insert into brand_kits (client_id, logo_url, color_palette, fonts, tone_of_voice, references_url, canva_url, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7, now())
     on conflict (client_id) do update set
       logo_url=$2, color_palette=$3, fonts=$4, tone_of_voice=$5, references_url=$6, canva_url=$7, updated_at=now()`,
    [client_id, logo_url, color_palette, fonts, tone_of_voice, references_url, canva_url]
  );

  revalidatePath(`/clients/${client_id}`);
  return {};
}

