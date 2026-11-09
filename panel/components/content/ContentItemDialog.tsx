"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CONTENT_FORMATS, SOCIAL_NETWORKS } from "@/lib/marketing/content";
import { CONTENT_STATUS_LABELS, CONTENT_STATUS_ORDER, type ContentItem, type ContentStatus } from "@/lib/types/domain";
import { toMendozaInputValue } from "@/lib/utils/dates";
import { deleteContentItemById, generateDraftAction, saveContentItem } from "@/app/(app)/calendar/actions";

export interface Option {
  id: string;
  name: string;
}

interface FormState {
  client_id: string;
  title: string;
  format: string;
  channels: string[];
  recording_at: string;
  scheduled_at: string;
  assigned_to: string;
  status: ContentStatus;
  script: string;
  copy: string;
  notes: string;
  attachment_url: string;
}

function initialState(item: ContentItem | null, defaults: Partial<FormState>): FormState {
  if (item) {
    return {
      client_id: item.client_id,
      title: item.title,
      format: item.format,
      channels: item.channels?.length ? item.channels : [item.channel],
      recording_at: toMendozaInputValue(item.recording_at),
      scheduled_at: toMendozaInputValue(item.scheduled_at),
      assigned_to: item.assigned_to ?? "",
      status: item.status,
      script: item.script ?? "",
      copy: item.copy ?? "",
      notes: item.notes ?? "",
      attachment_url: item.attachment_url ?? "",
    };
  }
  return {
    client_id: "",
    title: "",
    format: "reel",
    channels: ["instagram"],
    recording_at: "",
    scheduled_at: "",
    assigned_to: "",
    status: "idea",
    script: "",
    copy: "",
    notes: "",
    attachment_url: "",
    ...defaults,
  };
}

/**
 * Alta/edición de una pieza de contenido: tipo, redes, fechas de grabación y
 * publicación, responsable (solo gente de marketing), guion, copy y notas.
 * `readOnly`: el responsable sin acceso al cliente solo puede mover el estado.
 */
export function ContentItemDialog({
  open,
  onOpenChange,
  item,
  defaults = {},
  clients,
  marketers,
  canUseAi,
  readOnly = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ContentItem | null;
  defaults?: Partial<FormState>;
  clients: Option[];
  marketers: Option[];
  canUseAi: boolean;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(item, defaults));
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [generating, startGenerating] = useTransition();

  // Reinicia el formulario cada vez que se abre con otra pieza/fecha.
  const defaultsKey = JSON.stringify(defaults);
  useEffect(() => {
    if (open) {
      setForm(initialState(item, defaults));
      setError(null);
      setAiError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id, defaultsKey]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleChannel = (value: string) =>
    set("channels", form.channels.includes(value) ? form.channels.filter((c) => c !== value) : [...form.channels, value]);

  const fieldsDisabled = readOnly || saving;

  function save() {
    setError(null);
    startSaving(async () => {
      const payload = readOnly
        ? { id: item!.id, status: form.status }
        : {
            ...(item ? { id: item.id } : {}),
            ...form,
            channels: form.channels as never,
            format: form.format as never,
            assigned_to: form.assigned_to || null,
          };
      const result = await saveContentItem(payload as Parameters<typeof saveContentItem>[0]);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  function remove() {
    if (!item || !confirm(`¿Eliminar "${item.title}"?`)) return;
    startSaving(async () => {
      await deleteContentItemById(item.id);
      onOpenChange(false);
      router.refresh();
    });
  }

  function generate() {
    setAiError(null);
    startGenerating(async () => {
      const result = await generateDraftAction({
        client_id: form.client_id,
        title: form.title,
        format: form.format,
        channels: form.channels,
        notes: form.notes,
        script: form.script,
      });
      if (result.error) {
        setAiError(result.error);
        return;
      }
      setForm((f) => ({ ...f, script: result.script ?? f.script, copy: result.copy ?? f.copy }));
    });
  }

  const clientName = clients.find((c) => c.id === form.client_id)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-6 max-h-[calc(100vh-3rem)] max-w-2xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <DialogTitle className="text-base font-semibold text-text-primary">
            {item ? (readOnly ? item.title : "Editar contenido") : "Nuevo contenido"}
          </DialogTitle>
          <button type="button" onClick={() => onOpenChange(false)} aria-label="Cerrar" className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {item || clients.length === 1 ? (
            <div className="text-sm">
              <span className="font-medium text-text-primary">Cliente</span>
              <p className="mt-1.5 text-text-muted">{clientName ?? "—"}</p>
            </div>
          ) : (
            <Select label="Cliente" value={form.client_id} onChange={(e) => set("client_id", e.target.value)} disabled={fieldsDisabled}>
              <option value="">Elegí un cliente…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          <Input label="Título / idea" value={form.title} onChange={(e) => set("title", e.target.value)} disabled={fieldsDisabled} />

          <Select label="Tipo de contenido" value={form.format} onChange={(e) => set("format", e.target.value)} disabled={fieldsDisabled}>
            {CONTENT_FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
          <Select label="Responsable" value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)} disabled={fieldsDisabled}>
            <option value="">Sin asignar</option>
            {marketers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          <div className="sm:col-span-2">
            <span className="text-sm font-medium text-text-primary">Redes sociales</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {SOCIAL_NETWORKS.map((n) => {
                const active = form.channels.includes(n.value);
                return (
                  <button
                    key={n.value}
                    type="button"
                    disabled={fieldsDisabled}
                    onClick={() => toggleChannel(n.value)}
                    aria-pressed={active}
                    className={clsx(
                      "rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-60",
                      active ? "border-accent bg-accent/10 text-accent" : "border-border text-text-muted hover:border-accent"
                    )}
                  >
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Fecha de grabación"
            type="datetime-local"
            value={form.recording_at}
            onChange={(e) => set("recording_at", e.target.value)}
            disabled={fieldsDisabled}
          />
          <Input
            label="Fecha de publicación"
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => set("scheduled_at", e.target.value)}
            disabled={fieldsDisabled}
          />

          <Select label="Estado" value={form.status} onChange={(e) => set("status", e.target.value as ContentStatus)} disabled={saving}>
            {CONTENT_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {CONTENT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Input
            label="Link a archivos (Drive, Canva…)"
            value={form.attachment_url}
            onChange={(e) => set("attachment_url", e.target.value)}
            disabled={fieldsDisabled}
          />

          {canUseAi && !readOnly && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={generate} disabled={generating || !form.client_id}>
                <Sparkles size={15} />
                {generating ? "Escribiendo…" : form.script || form.copy ? "Mejorar guion y copy con IA" : "Generar guion y copy con IA"}
              </Button>
              <p className="text-xs text-text-muted">Usa el título, el tipo, las redes, tus notas y el tono de marca del cliente.</p>
              {aiError && <p className="w-full text-xs text-danger">{aiError}</p>}
            </div>
          )}

          <div className="sm:col-span-2">
            <Textarea label="Guion" rows={7} value={form.script} onChange={(e) => set("script", e.target.value)} disabled={fieldsDisabled} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Copy" rows={4} value={form.copy} onChange={(e) => set("copy", e.target.value)} disabled={fieldsDisabled} />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Notas especiales"
              rows={3}
              placeholder="Locación, vestuario, props, referencias, quién aparece…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              disabled={fieldsDisabled}
            />
          </div>

          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          {item && !readOnly ? (
            <Button type="button" variant="ghost" onClick={remove} disabled={saving} className="px-2 text-danger">
              <Trash2 size={15} />
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
