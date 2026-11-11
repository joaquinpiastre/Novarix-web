import "server-only";
import { metaGet } from "./client";
import type { MetaAssetType } from "@/lib/types/domain";

export interface AvailableMetaAsset {
  type: MetaAssetType;
  external_id: string;
  name: string;
}

/**
 * Cuentas publicitarias y paginas (+ su Instagram vinculado) a las que el
 * token tiene acceso. Si al token le falta el permiso de ads o de paginas,
 * esa parte se saltea (no es fatal).
 */
export async function discoverMetaAssets(token: string): Promise<AvailableMetaAsset[]> {
  const assets: AvailableMetaAsset[] = [];

  try {
    const adAccounts = await metaGet<{ data: { id: string; name: string }[] }>("me/adaccounts", token, {
      fields: "id,name",
      limit: "100",
    });
    for (const a of adAccounts.data ?? []) {
      assets.push({ type: "ad_account", external_id: a.id.replace(/^act_/, ""), name: a.name });
    }
  } catch {
    // sin permiso de ads
  }

  try {
    const pages = await metaGet<{
      data: { id: string; name: string; instagram_business_account?: { id: string; username: string } }[];
    }>("me/accounts", token, { fields: "id,name,instagram_business_account{id,username}", limit: "100" });
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
    // sin permiso de paginas
  }

  return assets;
}
