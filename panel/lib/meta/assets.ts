import "server-only";
import { metaGet } from "./client";
import type { MetaAssetType } from "@/lib/types/domain";

export interface AvailableMetaAsset {
  type: MetaAssetType;
  external_id: string;
  name: string;
  /** Portfolio comercial (Business Manager) al que pertenece, si Meta lo informa. */
  business_id?: string | null;
  business_name?: string | null;
}

type Biz = { id: string; name: string } | undefined;

/**
 * Cuentas publicitarias y paginas (+ su Instagram vinculado) a las que el
 * token tiene acceso, con el portfolio al que pertenece cada una. Si al token
 * le falta algun permiso, esa parte se saltea (no es fatal).
 */
export async function discoverMetaAssets(token: string): Promise<AvailableMetaAsset[]> {
  const assets: AvailableMetaAsset[] = [];

  const adAccounts = await metaGet<{ data: { id: string; name: string; business?: Biz }[] }>("me/adaccounts", token, {
    fields: "id,name,business{id,name}",
    limit: "200",
  }).catch(() => metaGet<{ data: { id: string; name: string; business?: Biz }[] }>("me/adaccounts", token, { fields: "id,name", limit: "200" }).catch(() => null));
  for (const a of adAccounts?.data ?? []) {
    assets.push({
      type: "ad_account",
      external_id: a.id.replace(/^act_/, ""),
      name: a.name,
      business_id: a.business?.id ?? null,
      business_name: a.business?.name ?? null,
    });
  }

  type PageRow = { id: string; name: string; business?: Biz; instagram_business_account?: { id: string; username: string } };
  const pages = await metaGet<{ data: PageRow[] }>("me/accounts", token, {
    fields: "id,name,business{id,name},instagram_business_account{id,username}",
    limit: "200",
  }).catch(() =>
    metaGet<{ data: PageRow[] }>("me/accounts", token, { fields: "id,name,instagram_business_account{id,username}", limit: "200" }).catch(() => null)
  );
  for (const p of pages?.data ?? []) {
    const biz = { business_id: p.business?.id ?? null, business_name: p.business?.name ?? null };
    assets.push({ type: "page", external_id: p.id, name: p.name, ...biz });
    if (p.instagram_business_account) {
      assets.push({ type: "instagram", external_id: p.instagram_business_account.id, name: `@${p.instagram_business_account.username}`, ...biz });
    }
  }

  return assets;
}
