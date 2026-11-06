export const ALLOWED_UPLOAD_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
]);

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export interface UploadValidation {
  error?: string;
}

export function validateUpload(file: File): UploadValidation {
  if (file.size === 0) return { error: "El archivo está vacío." };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `El archivo supera el máximo permitido (${MAX_UPLOAD_BYTES / 1024 / 1024} MB).` };
  }
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return { error: "Tipo de archivo no permitido. Subí una imagen, PDF o video corto." };
  }
  return {};
}
