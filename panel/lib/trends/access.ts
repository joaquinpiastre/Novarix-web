import "server-only";
import { query, queryOne } from "@/lib/db";
import { can } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/requirePermission";
import type { Profile } from "@/lib/types/domain";

// Gate de acceso al Radar, diagnostico e ideas.
// - admin / marketing_admin: todo (con o sin cliente).
// - marketing: solo trabajando sobre clientes donde esta en client_team; el
//   cliente es obligatorio.
// - programmer / client: sin acceso (no tienen trends.use).

export interface TrendsAccess {
  userId: string;
  profile: Profile;
  /** true = ve y usa todo; false = acotado a `clientIds`. */
  full: boolean;
  clientIds: string[];
}

export async function requireTrendsAccess(): Promise<TrendsAccess> {
  const { userId, profile } = await requirePermission("trends.use");
  const full = can(profile, "clients.manage");
  const clientIds = full
    ? []
    : (await query<{ client_id: string }>("select client_id from client_team where profile_id = $1", [userId])).map(
        (r) => r.client_id
      );
  return { userId, profile, full, clientIds };
}

/** Error (string) si la persona no puede trabajar con ese cliente (o sin cliente). */
export function clientAccessError(access: TrendsAccess, clientId: string | null | undefined): string | null {
  if (access.full) return null;
  if (!clientId) return "Elegí uno de tus clientes.";
  if (!access.clientIds.includes(clientId)) return "No tenés acceso a ese cliente.";
  return null;
}

export function canSeeClient(access: TrendsAccess, clientId: string | null): boolean {
  if (access.full) return true;
  return clientId != null && access.clientIds.includes(clientId);
}

/** Clientes que la persona puede elegir en los selectores. */
export async function selectableClients(access: TrendsAccess): Promise<{ id: string; name: string; industry: string | null }[]> {
  if (access.full) {
    return query(
      "select id, name, industry from clients where status in ('activo', 'prospecto') order by name"
    );
  }
  if (access.clientIds.length === 0) return [];
  return query("select id, name, industry from clients where id = any($1::uuid[]) order by name", [access.clientIds]);
}

/** Lectura de una busqueda con chequeo de acceso: propia, o del alcance de clientes. */
export async function loadAccessibleSearch<T extends { profile_id: string; client_id: string | null }>(
  access: TrendsAccess,
  searchId: string
): Promise<T | null> {
  if (!/^[0-9a-f-]{36}$/i.test(searchId)) return null;
  const row = await queryOne<T>("select * from trend_searches where id = $1", [searchId]);
  if (!row) return null;
  if (access.full || row.profile_id === access.userId || canSeeClient(access, row.client_id)) return row;
  return null;
}

/** Tablero accesible: de un cliente del alcance, o tematico creado por la persona (o cualquiera si full). */
export async function loadAccessibleBoard(
  access: TrendsAccess,
  boardId: string
): Promise<{ id: string; name: string; description: string | null; client_id: string | null; created_by: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(boardId)) return null;
  const board = await queryOne<{ id: string; name: string; description: string | null; client_id: string | null; created_by: string }>(
    "select id, name, description, client_id, created_by from swipe_boards where id = $1",
    [boardId]
  );
  if (!board) return null;
  if (access.full || board.created_by === access.userId || canSeeClient(access, board.client_id)) return board;
  return null;
}
