import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { queryOne } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { loadAccessibleBoard, requireTrendsAccess, selectableClients } from "@/lib/trends/access";
import { boardCards } from "@/lib/trends/queries";
import { ResultsView } from "../../_components/ResultsView";
import { DeleteBoardButton } from "./DeleteBoardButton";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: { id: string } }) {
  const access = await requireTrendsAccess();
  const board = await loadAccessibleBoard(access, params.id);
  if (!board) notFound();
  const [clients, cards, client] = await Promise.all([
    selectableClients(access),
    boardCards(board.id, board.client_id),
    board.client_id ? queryOne<{ name: string }>("select name from clients where id = $1", [board.client_id]) : null,
  ]);
  const canDelete = access.full || board.created_by === access.userId;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/marketing/radar/tableros" className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Tableros
      </Link>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{board.name}</h1>
            <Badge tone="accent">{client?.name ?? "Temático"}</Badge>
          </div>
          {board.description && <p className="text-sm text-text-muted">{board.description}</p>}
        </div>
        {canDelete && <DeleteBoardButton boardId={board.id} />}
      </div>
      {cards.length === 0 ? (
        <p className="text-sm text-text-muted">Este tablero está vacío. Guardá videos desde los resultados del Radar.</p>
      ) : (
        <ResultsView cards={cards} clientId={board.client_id} clients={clients} showSort={false} />
      )}
    </div>
  );
}
