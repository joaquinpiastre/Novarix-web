import "server-only";

// Graph API de Meta. La version se fija acá -- subirla cuando Meta la
// deprecie (avisan con bastante anticipación en developers.facebook.com).
const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export class MetaApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public subcode?: number
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

export async function metaGet<T = unknown>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${GRAPH_BASE}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const body = await res.json();

  if (!res.ok || body.error) {
    const err = body.error ?? {};
    throw new MetaApiError(err.message ?? `Error de Meta (HTTP ${res.status})`, err.code, err.error_subcode);
  }

  return body as T;
}

export interface MetaPaged<T> {
  data: T[];
  paging?: { next?: string; cursors?: { after?: string; before?: string } };
}

/** Trae todas las páginas siguiendo `paging.next`, hasta `maxPages` (protección contra loops). */
export async function metaGetAllPages<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
  maxPages = 20
): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | null = null;
  let page = 0;

  // Primera página vía metaGet para reusar el manejo de errores.
  const first = await metaGet<MetaPaged<T>>(path, accessToken, params);
  results.push(...(first.data ?? []));
  nextUrl = first.paging?.next ?? null;
  page++;

  while (nextUrl && page < maxPages) {
    const res = await fetch(nextUrl);
    const body = (await res.json()) as MetaPaged<T> & { error?: { message: string } };
    if (!res.ok || body.error) {
      throw new MetaApiError(body.error?.message ?? `Error de Meta (HTTP ${res.status})`);
    }
    results.push(...(body.data ?? []));
    nextUrl = body.paging?.next ?? null;
    page++;
  }

  return results;
}
