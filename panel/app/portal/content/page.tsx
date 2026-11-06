import { requirePortalAccess } from "@/lib/auth/requirePortalAccess";
import { query } from "@/lib/db";
import type { Comment, ContentItem } from "@/lib/types/domain";
import { ContentApprovalClient } from "./ContentApprovalClient";

export const dynamic = "force-dynamic";

export default async function PortalContentPage() {
  const { clientId } = await requirePortalAccess();

  const [items, comments] = await Promise.all([
    query<ContentItem>(
      "select * from content_items where client_id = $1 order by scheduled_at nulls last, created_at desc",
      [clientId]
    ),
    query<Comment & { author_name: string }>(
      `select c.*, p.full_name as author_name from comments c
       join profiles p on p.id = c.author_id
       where c.client_id = $1 and c.entity_type = 'content_item' and c.visible_to_client = true
       order by c.created_at asc`,
      [clientId]
    ),
  ]);

  const pending = items.filter((i) => i.status === "aprobacion_cliente");
  const rest = items.filter((i) => i.status !== "aprobacion_cliente");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Contenido</h1>
        <p className="text-sm text-text-muted">Revisá y aprobá las piezas antes de que se publiquen.</p>
      </div>
      <ContentApprovalClient pending={pending} rest={rest} comments={comments} />
    </div>
  );
}
