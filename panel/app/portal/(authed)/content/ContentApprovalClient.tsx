"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatDateTime } from "@/lib/utils/dates";
import { CONTENT_STATUS_LABELS, type Comment, type ContentItem } from "@/lib/types/domain";
import { addClientComment, approveContent, requestChanges, type ActionState } from "./actions";

function SubmitButton({ label, pendingLabel, variant }: { label: string; pendingLabel: string; variant?: "primary" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

function RequestChangesForm({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState<ActionState, FormData>(requestChanges, {});

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Pedir cambios
      </Button>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="id" value={itemId} />
      <Textarea name="comment" rows={2} placeholder="Contanos qué cambiarías…" required />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitButton label="Enviar" pendingLabel="Enviando…" variant="secondary" />
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function CommentForm({ itemId }: { itemId: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(addClientComment, {});
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="id" value={itemId} />
      <Textarea name="body" rows={1} placeholder="Agregar un comentario…" />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton label="Comentar" pendingLabel="Enviando…" variant="secondary" />
    </form>
  );
}

function CommentThread({ comments }: { comments: (Comment & { author_name: string })[] }) {
  if (comments.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2 border-t border-border pt-3">
      {comments.map((c) => (
        <li key={c.id} className="text-sm">
          <span className="font-medium text-text-primary">{c.author_name}</span>{" "}
          <span className="text-xs text-text-muted">{formatDateTime(c.created_at)}</span>
          <p className="text-text-primary">{c.body}</p>
        </li>
      ))}
    </ul>
  );
}

function PendingCard({
  item,
  comments,
}: {
  item: ContentItem;
  comments: (Comment & { author_name: string })[];
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary">{item.title}</p>
        <Badge tone="warning">Para aprobar</Badge>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {item.channel} · {item.format}
        {item.scheduled_at && ` · ${formatDate(item.scheduled_at)}`}
      </p>
      {item.copy && <p className="mt-2 text-sm text-text-primary">{item.copy}</p>}
      {item.attachment_url && (
        <a
          href={item.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-accent hover:underline"
        >
          Ver archivo →
        </a>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <form action={approveContent}>
          <input type="hidden" name="id" value={item.id} />
          <SubmitButton label="Aprobar" pendingLabel="Aprobando…" />
        </form>
        <RequestChangesForm itemId={item.id} />
      </div>
      <CommentThread comments={comments} />
      <CommentForm itemId={item.id} />
    </Card>
  );
}

export function ContentApprovalClient({
  pending,
  rest,
  comments,
}: {
  pending: ContentItem[];
  rest: ContentItem[];
  comments: (Comment & { author_name: string })[];
}) {
  const commentsByItem = new Map<string, (Comment & { author_name: string })[]>();
  for (const c of comments) {
    const arr = commentsByItem.get(c.entity_id) ?? [];
    arr.push(c);
    commentsByItem.set(c.entity_id, arr);
  }

  return (
    <div className="flex flex-col gap-5">
      {pending.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">No hay piezas esperando tu aprobación.</p>
        </Card>
      ) : (
        pending.map((item) => (
          <PendingCard key={item.id} item={item} comments={commentsByItem.get(item.id) ?? []} />
        ))
      )}

      {rest.length > 0 && (
        <Card>
          <CardTitle>Historial</CardTitle>
          <ul className="mt-3 divide-y divide-border">
            {rest.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-text-primary">{item.title}</p>
                  <Badge tone={item.status === "publicado" ? "success" : "neutral"}>
                    {CONTENT_STATUS_LABELS[item.status]}
                  </Badge>
                </div>
                <CommentThread comments={commentsByItem.get(item.id) ?? []} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
