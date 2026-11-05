"use server";

import { query } from "@/lib/db";
import { getSessionProfile } from "@/lib/auth/getSessionProfile";
import { scopeClientsFor, scopeTasksFor } from "@/lib/auth/permissions";

export interface SearchResult {
  id: string;
  type: "client" | "task";
  label: string;
}

// Alcance de la Fase 0: clientes y tareas. Todavia no existe `projects`
// (eso es Fase 5), asi que no hay mas fuentes para buscar por ahora.
export async function globalSearch(term: string): Promise<SearchResult[]> {
  const q = term.trim();
  if (q.length < 2) return [];

  const { userId, profile } = await getSessionProfile();
  const like = `%${q}%`;
  const results: SearchResult[] = [];

  if (scopeClientsFor(profile).all) {
    const clients = await query<{ id: string; name: string }>(
      "select id, name from clients where name ilike $1 order by name limit 5",
      [like]
    );
    results.push(...clients.map((c) => ({ id: c.id, type: "client" as const, label: c.name })));
  }

  const tasks = scopeTasksFor(profile).all
    ? await query<{ id: string; title: string }>(
        "select id, title from tasks where title ilike $1 order by created_at desc limit 5",
        [like]
      )
    : await query<{ id: string; title: string }>(
        `select id, title from tasks
         where title ilike $1 and (assigned_to = $2 or assigned_to is null)
         order by created_at desc limit 5`,
        [like, userId]
      );
  results.push(...tasks.map((t) => ({ id: t.id, type: "task" as const, label: t.title })));

  return results;
}
