"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Download, FileText, Folder, FolderPlus, Link2, Music, Pencil, Search, Trash2, Upload, X } from "lucide-react";
import clsx from "clsx";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { CONTENT_STATUS_LABELS, type ContentStatus } from "@/lib/types/domain";
import { fileKind, formatBytes, resolveContentType, sanitizeFolder } from "@/lib/library/files";
import { cancelUpload, deleteContentFile, finishUpload, linkContentFile, startUpload, updateContentFile } from "./actions";

export interface LibraryFile {
  id: string;
  folder: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  notes: string | null;
  created_at: string;
  content_item_id: string | null;
  uploader: string | null;
  item_title: string | null;
}

interface UploadJob {
  key: string;
  name: string;
  size: number;
  progress: number;
  status: "waiting" | "uploading" | "done" | "error";
  error?: string;
}

const fileUrl = (id: string, inline = false) => `/api/files/content-files/${id}${inline ? "?inline=1" : ""}`;

/** Sube un archivo directo al bucket (POST firmado) con progreso. */
function postToBucket(url: string, fields: Record<string, string>, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`El almacenamiento rechazó el archivo (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Se cortó la conexión durante la subida."));
    xhr.send(form);
  });
}

export function LibraryView({
  clientId,
  folder,
  query,
  defaultFolder,
  folders,
  files,
  contentItems,
  totalBytes,
  totalFiles,
  maxUploadMb,
}: {
  clientId: string;
  folder: string;
  query: string;
  defaultFolder: string;
  folders: { folder: string; files: number; bytes: number }[];
  files: LibraryFile[];
  contentItems: { id: string; title: string; status: string; recording_at: string | null }[];
  totalBytes: number;
  totalFiles: number;
  maxUploadMb: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dragging, setDragging] = useState(false);
  const [kind, setKind] = useState<"all" | "image" | "video" | "other">("all");
  const [search, setSearch] = useState(query);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const [uploadFolder, setUploadFolder] = useState(defaultFolder);
  const [editing, setEditing] = useState<LibraryFile | null>(null);
  const [linking, setLinking] = useState<LibraryFile | null>(null);

  const go = (next: { folder?: string | null; q?: string | null }) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("client", clientId);
    if (next.folder !== undefined) {
      if (next.folder) sp.set("folder", next.folder);
      else sp.delete("folder");
    }
    if (next.q !== undefined) {
      if (next.q) sp.set("q", next.q);
      else sp.delete("q");
    }
    router.push(`${pathname}?${sp.toString()}`);
  };

  // Subcarpetas directas de la carpeta actual (las carpetas son virtuales: existen si tienen archivos).
  const subfolders = useMemo(() => {
    const prefix = folder ? `${folder}/` : "";
    const map = new Map<string, { files: number; bytes: number }>();
    for (const f of folders) {
      if (folder && !f.folder.startsWith(prefix)) continue;
      const rest = f.folder.slice(prefix.length);
      if (!rest) continue;
      const name = rest.split("/")[0];
      const cur = map.get(name) ?? { files: 0, bytes: 0 };
      map.set(name, { files: cur.files + f.files, bytes: cur.bytes + f.bytes });
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [folders, folder]);

  const visible = files.filter((f) => {
    const k = fileKind(f.content_type);
    if (kind === "image") return k === "image";
    if (kind === "video") return k === "video";
    if (kind === "other") return k !== "image" && k !== "video";
    return true;
  });

  async function uploadFiles(list: FileList | File[]) {
    const target = sanitizeFolder(uploadFolder);
    if (target == null) {
      alert("El nombre de la carpeta de destino no es válido.");
      return;
    }
    const arr = Array.from(list);
    const newJobs: UploadJob[] = arr.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, name: f.name, size: f.size, progress: 0, status: "waiting" }));
    setJobs((prev) => [...newJobs, ...prev.filter((j) => j.status === "uploading" || j.status === "waiting")]);
    const update = (key: string, patch: Partial<UploadJob>) => setJobs((prev) => prev.map((j) => (j.key === key ? { ...j, ...patch } : j)));

    let index = 0;
    const worker = async () => {
      while (index < arr.length) {
        const i = index++;
        const file = arr[i];
        const job = newJobs[i];
        if (!resolveContentType(file.name, file.type)) {
          update(job.key, { status: "error", error: "Tipo de archivo no permitido" });
          continue;
        }
        if (file.size > maxUploadMb * 1024 * 1024) {
          update(job.key, { status: "error", error: `Supera ${maxUploadMb} MB` });
          continue;
        }
        update(job.key, { status: "uploading" });
        const start = await startUpload({ client_id: clientId, folder: target, filename: file.name, content_type: file.type, size: file.size });
        if (start.error !== undefined) {
          update(job.key, { status: "error", error: start.error });
          continue;
        }
        try {
          await postToBucket(start.url, start.fields, file, (p) => update(job.key, { progress: p }));
          const fin = await finishUpload(start.id);
          if (fin.error !== undefined) update(job.key, { status: "error", error: fin.error });
          else update(job.key, { status: "done", progress: 100 });
        } catch (err) {
          await cancelUpload(start.id);
          update(job.key, { status: "error", error: err instanceof Error ? err.message : "Falló la subida" });
        }
      }
    };
    await Promise.all([worker(), worker()]);
    if (target !== folder && !query) go({ folder: target });
    else router.refresh();
  }

  const crumbs = folder ? folder.split("/") : [];
  const uploading = jobs.some((j) => j.status === "uploading" || j.status === "waiting");

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-text-muted">Archivos</p>
          <p className="num text-xl font-semibold text-text-primary">{totalFiles}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-text-muted">Espacio usado</p>
          <p className="num text-xl font-semibold text-text-primary">{formatBytes(totalBytes)}</p>
        </Card>
        <Card className="col-span-2 p-4 sm:col-span-1">
          <p className="text-xs uppercase tracking-wider text-text-muted">Máximo por archivo</p>
          <p className="num text-xl font-semibold text-text-primary">{formatBytes(maxUploadMb * 1024 * 1024)}</p>
        </Card>
      </div>

      {/* Subida */}
      <Card
        className={clsx("flex flex-col gap-3 border-2 border-dashed transition-colors", dragging ? "border-accent bg-accent/5" : "border-border")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Carpeta de destino" value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} placeholder="Ej: 2026-11/Reels" />
          </div>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4" /> {uploading ? "Subiendo…" : "Subir archivos"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept="image/*,video/*,audio/*,application/pdf,.zip,.psd,.ai,.eps,.heic,.mov,.srt,.txt"
            onChange={(e) => {
              if (e.target.files?.length) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        <p className="text-xs text-text-muted">
          Arrastrá archivos acá o tocá “Subir archivos” (en el celular podés elegir de la galería). Fotos, videos, audio, PDF, ZIP y diseños. Se suben directo a la nube del panel, de a dos por vez.
        </p>
        {jobs.length > 0 && (
          <ul className="flex flex-col gap-2">
            {jobs.map((j) => (
              <li key={j.key} className="flex flex-col gap-1 rounded-xl bg-surface-hover px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-text-primary">{j.name}</span>
                  <span className={clsx("shrink-0", j.status === "error" ? "text-danger" : j.status === "done" ? "text-success" : "text-text-muted")}>
                    {j.status === "error" ? j.error : j.status === "done" ? "Listo" : j.status === "waiting" ? "En espera" : `${j.progress}% de ${formatBytes(j.size)}`}
                  </span>
                </div>
                {(j.status === "uploading" || j.status === "done") && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div className={clsx("h-full rounded-full transition-all", j.status === "done" ? "bg-success" : "bg-accent")} style={{ width: `${j.progress}%` }} />
                  </div>
                )}
              </li>
            ))}
            {!uploading && (
              <button type="button" onClick={() => setJobs([])} className="self-start text-xs text-text-muted underline">
                Limpiar lista
              </button>
            )}
          </ul>
        )}
      </Card>

      {/* Navegacion */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button type="button" onClick={() => go({ folder: null, q: null })} className={clsx("rounded-lg px-2 py-1", folder || query ? "text-text-muted hover:text-text-primary" : "font-medium text-text-primary")}>
            Todo
          </button>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-text-muted" />
              <button
                type="button"
                onClick={() => go({ folder: crumbs.slice(0, i + 1).join("/"), q: null })}
                className={clsx("rounded-lg px-2 py-1", i === crumbs.length - 1 ? "font-medium text-text-primary" : "text-text-muted hover:text-text-primary")}
              >
                {c}
              </button>
            </span>
          ))}
          {query && <Badge tone="accent">Resultados para “{query}”</Badge>}
        </nav>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: search.trim() || null });
          }}
        >
          <Input aria-label="Buscar archivo" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre" />
          <Button type="submit" variant="secondary" aria-label="Buscar">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Carpetas */}
      {!query && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {subfolders.map(([name, info]) => (
            <button
              key={name}
              type="button"
              onClick={() => go({ folder: folder ? `${folder}/${name}` : name })}
              className="flex flex-col items-start gap-1 rounded-2xl border border-border bg-surface p-3 text-left hover:border-accent"
            >
              <Folder className="h-5 w-5 text-accent" />
              <span className="w-full truncate text-sm font-medium text-text-primary">{name}</span>
              <span className="text-xs text-text-muted">
                {info.files} archivo{info.files === 1 ? "" : "s"} · {formatBytes(info.bytes)}
              </span>
            </button>
          ))}
          {newFolder == null ? (
            <button
              type="button"
              onClick={() => setNewFolder("")}
              className="flex flex-col items-start gap-1 rounded-2xl border border-dashed border-border p-3 text-left text-text-muted hover:border-accent hover:text-text-primary"
            >
              <FolderPlus className="h-5 w-5" />
              <span className="text-sm">Nueva carpeta</span>
            </button>
          ) : (
            <form
              className="col-span-2 flex items-center gap-2 rounded-2xl border border-accent p-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = sanitizeFolder(newFolder);
                if (!name) return;
                const full = folder ? `${folder}/${name}` : name;
                if (sanitizeFolder(full) == null) {
                  alert("Máximo 3 niveles de carpetas.");
                  return;
                }
                setUploadFolder(full);
                setNewFolder(null);
                go({ folder: full });
              }}
            >
              <Input aria-label="Nombre de la carpeta" autoFocus value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="Nombre" />
              <Button type="submit">Crear</Button>
              <Button type="button" variant="ghost" onClick={() => setNewFolder(null)} aria-label="Cancelar">
                <X className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Archivos */}
      <div className="flex flex-wrap gap-2">
        {(["all", "image", "video", "other"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={clsx("rounded-full px-3 py-1 text-xs font-medium", kind === k ? "bg-accent text-accent-fg" : "bg-surface-hover text-text-muted hover:text-text-primary")}
          >
            {k === "all" ? "Todo" : k === "image" ? "Fotos" : k === "video" ? "Videos" : "Otros"}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card className="text-sm text-text-muted">
          {query ? "No hay archivos con ese nombre." : folder ? "Esta carpeta todavía no tiene archivos. Subí algo con el botón de arriba (la carpeta de destino ya está puesta)." : "Todavía no hay archivos sueltos acá: entrá a una carpeta o subí contenido."}
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((f) => (
            <FileCard key={f.id} file={f} showFolder={Boolean(query)} onEdit={() => setEditing(f)} onLink={() => setLinking(f)} />
          ))}
        </div>
      )}

      {editing && <EditDialog file={editing} onClose={() => setEditing(null)} />}
      {linking && <LinkDialog file={linking} items={contentItems} onClose={() => setLinking(null)} />}
    </div>
  );
}

function FileCard({ file, showFolder, onEdit, onLink }: { file: LibraryFile; showFolder: boolean; onEdit: () => void; onLink: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const kind = fileKind(file.content_type);
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <a href={fileUrl(file.id, true)} target="_blank" rel="noopener noreferrer" className="relative flex aspect-square items-center justify-center bg-surface-hover">
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl(file.id, true)} alt={file.filename} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : kind === "video" ? (
          <video src={`${fileUrl(file.id, true)}#t=0.5`} preload="metadata" muted playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : kind === "audio" ? (
          <Music className="h-8 w-8 text-text-muted" />
        ) : (
          <FileText className="h-8 w-8 text-text-muted" />
        )}
        {kind === "video" && <Badge className="absolute left-2 top-2" tone="accent">Video</Badge>}
      </a>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className="truncate text-xs font-medium text-text-primary" title={file.filename}>{file.filename}</p>
        <p className="text-[11px] text-text-muted">
          {formatBytes(file.size_bytes)} · {new Date(file.created_at).toLocaleDateString("es-AR")}
          {file.uploader ? ` · ${file.uploader.split(" ")[0]}` : ""}
        </p>
        {showFolder && <p className="truncate text-[11px] text-text-muted">📁 {file.folder || "(raíz)"}</p>}
        {file.item_title && (
          <Link href={`/calendar?item=${file.content_item_id}`} className="truncate text-[11px] text-accent underline" title={file.item_title}>
            🗓 {file.item_title}
          </Link>
        )}
        {file.notes && <p className="line-clamp-2 text-[11px] text-text-muted">{file.notes}</p>}
        <div className="mt-auto flex items-center gap-0.5 pt-1">
          <a href={fileUrl(file.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary" title="Descargar">
            <Download className="h-4 w-4" />
          </a>
          <button type="button" onClick={onLink} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary" title="Vincular a una pieza del calendario">
            <Link2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary" title="Renombrar / mover">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`¿Eliminar "${file.filename}"? No se puede deshacer.`)) return;
              start(async () => {
                await deleteContentFile(file.id);
                router.refresh();
              });
            }}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-danger"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const dialogClass = "max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto p-5";

function EditDialog({ file, onClose }: { file: LibraryFile; onClose: () => void }) {
  const router = useRouter();
  const [filename, setFilename] = useState(file.filename);
  const [folder, setFolder] = useState(file.folder);
  const [notes, setNotes] = useState(file.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={dialogClass}>
        <DialogTitle className="text-base font-semibold text-text-primary">Editar archivo</DialogTitle>
        <div className="mt-4 flex flex-col gap-3">
          <Input label="Nombre" value={filename} onChange={(e) => setFilename(e.target.value)} />
          <Input label="Carpeta" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="(raíz)" />
          <Textarea label="Notas" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await updateContentFile(file.id, { filename, folder, notes });
                  if (res.error !== undefined) setError(res.error);
                  else {
                    onClose();
                    router.refresh();
                  }
                })
              }
            >
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkDialog({ file, items, onClose }: { file: LibraryFile; items: { id: string; title: string; status: string; recording_at: string | null }[]; onClose: () => void }) {
  const router = useRouter();
  const [itemId, setItemId] = useState(file.content_item_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={dialogClass}>
        <DialogTitle className="text-base font-semibold text-text-primary">Vincular a una pieza del calendario</DialogTitle>
        <div className="mt-4 flex flex-col gap-3">
          <CardTitle className="truncate text-sm">{file.filename}</CardTitle>
          <Select label="Pieza" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Sin vincular</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title} · {CONTENT_STATUS_LABELS[i.status as ContentStatus] ?? i.status}
                {i.recording_at ? ` · ${new Date(i.recording_at).toLocaleDateString("es-AR")}` : ""}
              </option>
            ))}
          </Select>
          <p className="text-xs text-text-muted">
            El archivo queda asociado a la pieza; si la pieza no tenía archivo, pasa a ser el principal. Al vincularlo, el cliente también lo puede ver desde su portal (Contenido).
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await linkContentFile(file.id, itemId || null);
                  if (res.error !== undefined) setError(res.error);
                  else {
                    onClose();
                    router.refresh();
                  }
                })
              }
            >
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
