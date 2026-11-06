"use server";

import { revalidatePath } from "next/cache";
import { query, queryOne } from "@/lib/db";
import { requireClientAccess } from "@/lib/auth/requireClientAccess";
import { encrypt, decrypt } from "@/lib/crypto/encryption";
import { metaGet, MetaApiError } from "@/lib/meta/client";
import { syncConnection } from "@/lib/meta/sync";
import { recordAudit } from "@/lib/audit/log";
import { getClientIp } from "@/lib/utils/request";
import type { MetaAssetType, MetaConnection } from "@/lib/types/domain";

export interface ActionState {
  error?: string;
}

export async function connectMeta(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const client_id = String(formData.get("client_id") ?? "");
  const { userId: actorId } = await requireClientAccess(client_id);

  const token = String(formData.get("access_token") ?? "").trim();
  if (!token) return { error: "Pegá un access token." };

  // Valida el token antes de guardarlo -- un /me simple alcanza para
  // confirmar que es valido y no esta vencido.
  try {
    await metaGet("me", token);
  } catch (err) {
    const message = err instanceof MetaApiError ? err.message : "Token inválido.";
    return { error: `No se pudo validar el token: ${message}` };
  }

  await query(
    `insert into meta_connections (client_id, access_token, status, created_by)
     values ($1, $2, 'active', $3)`,
    [client_id, encrypt(token), actorId]
  );

  await recordAudit({
    actorId,
    action: "meta_connections.create",
    entityType: "meta_connection",
    entityId: client_id,
    ip: getClientIp(),
  });

  revalidatePath(`/clients/${client_id}`);
  return {};
}

export async function disconnectMeta(formData: FormData): Promise<void> {
  const client_id = String(formData.get("client_id") ?? "");
  const connection_id = String(formData.get("connection_id") ?? "");
  const { userId: actorId } = await requireClientAccess(client_id);
  if (!connection_id) return;

  await query("delete from meta_connections where id = $1", [connection_id]);

  await recordAudit({
    actorId,
    action: "meta_connections.delete",
    entityType: "meta_connection",
    entityId: connection_id,
    ip: getClientIp(),
  });

  revalidatePath(`/clients/${client_id}`);
}

export interface AvailableAsset {
  type: MetaAssetType;
  external_id: string;
  name: string;
}

export interface ListAssetsState {
  error?: string;
  assets?: AvailableAsset[];
}

/** Lista las cuentas publicitarias y paginas (+ su IG vinculado) a las que el token tiene acceso. */
export async function listAvailableMetaAssets(
  _prevState: ListAssetsState,
  formData: FormData
): Promise<ListAssetsState> {
  const client_id = String(formData.get("client_id") ?? "");
  const connection_id = String(formData.get("connection_id") ?? "");
  await requireClientAccess(client_id);

  const connection = await queryOne<MetaConnection>("select * from meta_connections where id = $1", [
    connection_id,
  ]);
  if (!connection) return { error: "Conexión no encontrada." };

  const token = decrypt(connection.access_token);
  const assets: AvailableAsset[] = [];

  try {
    const adAccounts = await metaGet<{ data: { id: string; name: string }[] }>(
      "me/adaccounts",
      token,
      { fields: "id,name" }
    );
    for (const a of adAccounts.data ?? []) {
      assets.push({ type: "ad_account", external_id: a.id.replace(/^act_/, ""), name: a.name });
    }
  } catch {
    // seguimos -- puede que el token no tenga permiso de ads, no es fatal.
  }

  try {
    const pages = await metaGet<{
      data: { id: string; name: string; instagram_business_account?: { id: string; username: string } }[];
    }>("me/accounts", token, { fields: "id,name,instagram_business_account{id,username}" });
    for (const p of pages.data ?? []) {
      assets.push({ type: "page", external_id: p.id, name: p.name });
      if (p.instagram_business_account) {
        assets.push({
          type: "instagram",
          external_id: p.instagram_business_account.id,
          name: `@${p.instagram_business_account.username}`,
        });
      }
    }
  } catch {
    // idem -- puede que falte el permiso de paginas.
  }

  if (assets.length === 0) {
    return { error: "El token no tiene acceso a ninguna cuenta publicitaria ni página." };
  }

  return { assets };
}

export async function addMetaAsset(formData: FormData): Promise<void> {
  const client_id = String(formData.get("client_id") ?? "");
  const connection_id = String(formData.get("connection_id") ?? "");
  const asset_type = String(formData.get("asset_type") ?? "") as MetaAssetType;
  const external_id = String(formData.get("external_id") ?? "");
  const name = String(formData.get("name") ?? "");
  await requireClientAccess(client_id);
  if (!connection_id || !asset_type || !external_id) return;

  await query(
    `insert into meta_assets (connection_id, client_id, asset_type, external_id, name)
     values ($1,$2,$3,$4,$5)
     on conflict (connection_id, asset_type, external_id) do update set active = true, name = excluded.name`,
    [connection_id, client_id, asset_type, external_id, name]
  );

  revalidatePath(`/clients/${client_id}`);
}

export async function removeMetaAsset(formData: FormData): Promise<void> {
  const client_id = String(formData.get("client_id") ?? "");
  const id = String(formData.get("id") ?? "");
  await requireClientAccess(client_id);
  if (!id) return;
  await query("update meta_assets set active = false where id = $1", [id]);
  revalidatePath(`/clients/${client_id}`);
}

export interface SyncNowState {
  error?: string;
  ok?: boolean;
}

export async function syncMetaNow(
  _prevState: SyncNowState,
  formData: FormData
): Promise<SyncNowState> {
  const client_id = String(formData.get("client_id") ?? "");
  const connection_id = String(formData.get("connection_id") ?? "");
  await requireClientAccess(client_id);
  if (!connection_id) return { error: "Falta la conexión." };

  try {
    await syncConnection(connection_id, 7);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Falló la sincronización." };
  }

  revalidatePath(`/clients/${client_id}`);
  return { ok: true };
}

export async function resolveAlert(formData: FormData): Promise<void> {
  const client_id = String(formData.get("client_id") ?? "");
  const id = String(formData.get("id") ?? "");
  await requireClientAccess(client_id);
  if (!id) return;
  await query("update alerts set resolved = true, resolved_at = now() where id = $1", [id]);
  revalidatePath(`/clients/${client_id}`);
}
