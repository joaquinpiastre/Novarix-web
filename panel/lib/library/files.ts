// Reglas de la biblioteca de contenido. Sin imports de servidor: las usan
// las server actions, la ruta de descarga y la pantalla.

/** Tope por archivo (por defecto 2 GB; el POST firmado de S3 admite hasta 5 GB). */
export const DEFAULT_MAX_UPLOAD_MB = 2048;

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  pdf: "application/pdf",
  zip: "application/zip",
  psd: "image/vnd.adobe.photoshop",
  ai: "application/postscript",
  eps: "application/postscript",
  txt: "text/plain",
  srt: "text/plain",
};

const ALLOWED_PREFIXES = ["image/", "video/", "audio/"];
const ALLOWED_EXACT = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/postscript",
  "image/vnd.adobe.photoshop",
  "text/plain",
]);

export type FileKind = "image" | "video" | "audio" | "pdf" | "other";

function extension(filename: string): string {
  const m = /\.([a-z0-9]{1,6})$/i.exec(filename);
  return m ? m[1].toLowerCase() : "";
}

/** Tipo MIME a usar: el del navegador si es valido, si no por extension (el celular a veces manda vacio). */
export function resolveContentType(filename: string, browserType: string | null | undefined): string | null {
  const type = (browserType ?? "").trim().toLowerCase();
  if (type && type !== "application/octet-stream" && isAllowedType(type)) return type;
  const byExt = EXTENSION_TYPES[extension(filename)];
  return byExt && isAllowedType(byExt) ? byExt : null;
}

export function isAllowedType(type: string): boolean {
  // SVG puede traer scripts: se permite guardarlo pero nunca se muestra en linea (ver isInlinePreviewable).
  return ALLOWED_PREFIXES.some((p) => type.startsWith(p)) || ALLOWED_EXACT.has(type);
}

export function fileKind(type: string): FileKind {
  if (type === "image/svg+xml" || type === "image/vnd.adobe.photoshop" || type === "image/heic" || type === "image/heif") return "other";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "application/pdf") return "pdf";
  return "other";
}

/** Solo estos tipos se sirven "inline" (vista previa); el resto siempre como descarga. */
export function isInlinePreviewable(type: string): boolean {
  const kind = fileKind(type);
  return kind === "image" || kind === "video" || kind === "audio" || kind === "pdf";
}

export function sanitizeFilename(name: string): string {
  const clean = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(-180);
  return clean || "archivo";
}

/**
 * Carpeta virtual: hasta 3 niveles separados por "/", cada uno con letras,
 * numeros, espacios, guiones y guion bajo. Devuelve null si es invalida.
 */
export function sanitizeFolder(raw: string | null | undefined): string | null {
  const parts = (raw ?? "")
    .split("/")
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (parts.length > 3) return null;
  for (const p of parts) {
    if (p.length > 60 || p === "." || p === ".." || !/^[\p{L}\p{N} _.-]+$/u.test(p)) return null;
  }
  return parts.join("/");
}

export function currentMonthFolder(now: Date = new Date()): string {
  const ym = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Mendoza", year: "numeric", month: "2-digit" }).format(now);
  return ym.slice(0, 7);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1).replace(".", ",")} ${units[i]}`;
}
