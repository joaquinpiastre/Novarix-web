import { describe, expect, it } from "vitest";
import {
  currentMonthFolder,
  fileKind,
  formatBytes,
  isInlinePreviewable,
  resolveContentType,
  sanitizeFilename,
  sanitizeFolder,
} from "./files";

describe("biblioteca: tipos de archivo", () => {
  it("acepta fotos, videos, audio, PDF y diseños", () => {
    expect(resolveContentType("reel.mp4", "video/mp4")).toBe("video/mp4");
    expect(resolveContentType("foto.HEIC", "")).toBe("image/heic");
    expect(resolveContentType("toma.MOV", "application/octet-stream")).toBe("video/quicktime");
    expect(resolveContentType("diseño.psd", "")).toBe("image/vnd.adobe.photoshop");
    expect(resolveContentType("brief.pdf", "application/pdf")).toBe("application/pdf");
  });

  it("rechaza ejecutables y tipos desconocidos", () => {
    expect(resolveContentType("virus.exe", "application/x-msdownload")).toBeNull();
    expect(resolveContentType("pagina.html", "text/html")).toBeNull();
    expect(resolveContentType("script.js", "")).toBeNull();
  });

  it("solo se ve en línea lo seguro (nunca SVG)", () => {
    expect(isInlinePreviewable("image/jpeg")).toBe(true);
    expect(isInlinePreviewable("video/mp4")).toBe(true);
    expect(isInlinePreviewable("image/svg+xml")).toBe(false);
    expect(isInlinePreviewable("application/zip")).toBe(false);
    expect(fileKind("image/svg+xml")).toBe("other");
  });
});

describe("biblioteca: nombres y carpetas", () => {
  it("limpia nombres peligrosos", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe(".._.._etc_passwd");
    expect(sanitizeFilename("   ")).toBe("archivo");
    expect(sanitizeFilename("Reel  final.mp4")).toBe("Reel final.mp4");
  });

  it("carpetas de hasta 3 niveles, sin ../", () => {
    expect(sanitizeFolder("2026-11 / Reels")).toBe("2026-11/Reels");
    expect(sanitizeFolder("")).toBe("");
    expect(sanitizeFolder("Día de la Madre")).toBe("Día de la Madre");
    expect(sanitizeFolder("a/b/c/d")).toBeNull();
    expect(sanitizeFolder("../secreto")).toBeNull();
    expect(sanitizeFolder("hola<script>")).toBeNull();
  });

  it("carpeta del mes en hora de Mendoza", () => {
    expect(currentMonthFolder(new Date("2026-12-01T01:00:00Z"))).toBe("2026-11");
  });

  it("formatea tamaños", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(1536)).toBe("1,5 KB");
    expect(formatBytes(1024 * 1024 * 250)).toBe("250 MB");
  });
});
