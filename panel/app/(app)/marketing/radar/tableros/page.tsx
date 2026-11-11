import Link from "next/link";
import { query } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requireTrendsAccess, selectableClients } from "@/lib/trends/access";
import { RadarHeader } from "../_components/RadarNav";
import { NewBoardForm } from "./NewBoardForm";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const access = await requireTrendsAccess();
  const [clients, boards] = await Promise.all([
    selectableClients(access),
    query<{ id: string; name: string; description: string | null; client_name: string | null; items: number; author: string }>(
      `select b.id, b.name, b.description, c.name as client_name, p.full_name as author,
              (select count(*)::int from swipe_items i where i.board_id = b.id) as items
       from swipe_boards b
       left join clients c on c.id = b.client_id
       join profiles p on p.id = b.created_by
       where $1::boolean or b.created_by = $2 or b.client_id = any($3::uuid[])
       order by b.created_at desc`,
      [access.full, access.userId, access.clientIds]
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <RadarHeader active="/marketing/radar/tableros" title="Tableros de referencias" subtitle="Swipe files por cliente o por tema: los videos que nos sirven, con notas y etiquetas." />
      <NewBoardForm clients={clients} requireClient={!access.full} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {boards.map((b) => (
          <Link key={b.id} href={`/marketing/radar/tableros/${b.id}`}>
            <Card className="flex h-full flex-col gap-2 hover:border-accent">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-text-primary">{b.name}</p>
                <Badge>{b.items} video{b.items === 1 ? "" : "s"}</Badge>
              </div>
              {b.description && <p className="text-sm text-text-muted">{b.description}</p>}
              <p className="mt-auto text-xs text-text-muted">{b.client_name ?? "Temático"} · {b.author}</p>
            </Card>
          </Link>
        ))}
        {boards.length === 0 && <p className="text-sm text-text-muted">Todavía no hay tableros. Creá uno o guardá un video desde el Radar.</p>}
      </div>
    </div>
  );
}
