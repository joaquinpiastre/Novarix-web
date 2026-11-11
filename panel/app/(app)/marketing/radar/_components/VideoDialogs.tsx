"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CONTENT_FORMATS, SOCIAL_NETWORKS } from "@/lib/marketing/content";
import type { VideoCardData } from "@/lib/trends/view";
import { convertToIdea, listMyBoards, saveToBoard } from "../actions";

const dialogClass = "max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto p-5";

export function SaveToBoardDialog({
  open,
  onOpenChange,
  videoId,
  clientId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  videoId: string;
  clientId: string | null;
}) {
  const [boards, setBoards] = useState<{ id: string; name: string; client_name: string | null }[]>([]);
  const [boardId, setBoardId] = useState("");
  const [newName, setNewName] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [msg, setMsg] = useState<{ error?: string; boardId?: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    listMyBoards().then((list) => {
      setBoards(list);
      setBoardId((prev) => prev || list[0]?.id || "");
    });
  }, [open]);

  function save() {
    start(async () => {
      const res = await saveToBoard({
        video_id: videoId,
        board_id: boardId || null,
        new_board_name: boardId ? null : newName,
        client_id: clientId,
        notes,
        tags: tags.split(","),
      });
      setMsg(res.error !== undefined ? { error: res.error } : { boardId: res.boardId });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClass}>
        <DialogTitle className="text-base font-semibold text-text-primary">Guardar en un tablero</DialogTitle>
        <div className="mt-4 flex flex-col gap-3">
          <Select label="Tablero" value={boardId} onChange={(e) => setBoardId(e.target.value)}>
            <option value="">+ Tablero nuevo</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}{b.client_name ? ` (${b.client_name})` : ""}
              </option>
            ))}
          </Select>
          {!boardId && <Input label="Nombre del tablero nuevo" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Antes y después" />}
          <Textarea label="Notas (opcional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Input label="Etiquetas (separadas por coma)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="gancho, antes-despues" />
          {msg?.error && <p className="text-sm text-danger">{msg.error}</p>}
          {msg?.boardId && (
            <p className="text-sm text-success">
              Guardado. <Link href={`/marketing/radar/tableros/${msg.boardId}`} className="underline">Ver tablero</Link>
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
            <Button onClick={save} disabled={pending || (!boardId && !newName.trim())}>{pending ? "Guardando…" : "Guardar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function adaptationScript(v: VideoCardData, index: number): string {
  const ad = v.analysis?.adaptations[index];
  if (!ad) return "";
  const shots = ad.shots
    .map((s) => `${s.time} — ${s.shot}${s.on_screen_text ? ` | Texto: "${s.on_screen_text}"` : ""}${s.voiceover ? ` | Voz: ${s.voiceover}` : ""}`)
    .join("\n");
  return `GANCHO: ${ad.hook}\n\n${ad.script}${shots ? `\n\nPLANO POR PLANO:\n${shots}` : ""}`;
}

export function ConvertDialog({
  open,
  onOpenChange,
  video,
  clientId,
  clients,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  video: VideoCardData;
  clientId: string | null;
  clients: { id: string; name: string }[];
}) {
  const adaptations = video.analysis?.adaptations ?? [];
  const [pick, setPick] = useState(0);
  const [client, setClient] = useState(clientId ?? "");
  const [title, setTitle] = useState(adaptations[0]?.title ?? "");
  const [script, setScript] = useState(adaptationScript(video, 0));
  const [format, setFormat] = useState("reel");
  const [channels, setChannels] = useState<string[]>([video.platform === "youtube" ? "youtube" : video.platform === "tiktok" ? "tiktok" : "instagram"]);
  const [sendToClient, setSendToClient] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; id?: string } | null>(null);
  const [pending, start] = useTransition();

  function choose(i: number) {
    setPick(i);
    setTitle(adaptations[i]?.title ?? "");
    setScript(adaptationScript(video, i));
  }

  function save() {
    start(async () => {
      const res = await convertToIdea({
        video_id: video.videoId,
        client_id: client,
        title,
        script,
        format: format as never,
        channels: channels as never,
        notes: video.analysis ? `Por qué funcionó (IA): ${video.analysis.why_it_worked.join("; ")}` : null,
        send_to_client: sendToClient,
      });
      setMsg(res.error !== undefined ? { error: res.error } : { id: res.contentItemId });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClass}>
        <DialogTitle className="text-base font-semibold text-text-primary">Convertir en idea del calendario</DialogTitle>
        <div className="mt-4 flex flex-col gap-3">
          {adaptations.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {adaptations.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => choose(i)}
                  className={`rounded-full border px-3 py-1 text-xs ${pick === i ? "border-accent text-text-primary" : "border-border text-text-muted"}`}
                >
                  Idea {i + 1}: {a.title.slice(0, 30)}
                </button>
              ))}
            </div>
          )}
          <Select label="Cliente" value={client} onChange={(e) => setClient(e.target.value)}>
            <option value="">Elegí un cliente…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea label="Guion adaptado" rows={8} value={script} onChange={(e) => setScript(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Formato" value={format} onChange={(e) => setFormat(e.target.value)}>
              {CONTENT_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </Select>
            <Select
              label="Red"
              value={channels[0]}
              onChange={(e) => setChannels([e.target.value])}
            >
              {SOCIAL_NETWORKS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={sendToClient} onChange={(e) => setSendToClient(e.target.checked)} />
            Mandarla al portal del cliente para que la apruebe
          </label>
          <p className="text-xs text-text-muted">Se guarda con el link al video de referencia. El guion es una propuesta de la IA: revisalo antes de grabar.</p>
          {msg?.error && <p className="text-sm text-danger">{msg.error}</p>}
          {msg?.id && (
            <p className="text-sm text-success">
              Listo. <Link href={`/calendar?item=${msg.id}`} className="underline">Ver en el calendario</Link>
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
            <Button onClick={save} disabled={pending || !client || !title.trim() || Boolean(msg?.id)}>{pending ? "Creando…" : "Crear idea"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
