import { describe, expect, it } from "vitest";
import { embedUrl, isShortTikTokUrl, parseVideoUrl } from "./links";
import { extractHashtags, normalizePlan, type SearchPlan } from "./types";

describe("parseVideoUrl", () => {
  it("YouTube: shorts, watch y youtu.be", () => {
    expect(parseVideoUrl("https://www.youtube.com/shorts/abcDEF12345")).toMatchObject({ platform: "youtube", externalId: "abcDEF12345" });
    expect(parseVideoUrl("https://youtube.com/watch?v=abcDEF12345&t=3")).toMatchObject({ externalId: "abcDEF12345" });
    expect(parseVideoUrl("https://youtu.be/abcDEF12345")).toMatchObject({ externalId: "abcDEF12345" });
  });

  it("Instagram: reel y post, con o sin usuario en la ruta", () => {
    expect(parseVideoUrl("https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=xx")).toMatchObject({ platform: "instagram", externalId: "C1a2B3c4D5e" });
    expect(parseVideoUrl("https://instagram.com/p/C1a2B3c4D5e/")?.canonicalUrl).toBe("https://www.instagram.com/p/C1a2B3c4D5e/");
    expect(parseVideoUrl("https://www.instagram.com/cuenta/reel/C1a2B3c4D5e/")).toMatchObject({ externalId: "C1a2B3c4D5e" });
  });

  it("TikTok: video con usuario", () => {
    expect(parseVideoUrl("https://www.tiktok.com/@pintureria/video/7311111111111111111?lang=es")).toMatchObject({
      platform: "tiktok",
      externalId: "7311111111111111111",
      canonicalUrl: "https://www.tiktok.com/@pintureria/video/7311111111111111111",
    });
    expect(isShortTikTokUrl("https://vm.tiktok.com/ZMabc/")).toBe(true);
  });

  it("rechaza links que no son videos", () => {
    expect(parseVideoUrl("https://example.com/video/1")).toBeNull();
    expect(parseVideoUrl("no es un link")).toBeNull();
    expect(parseVideoUrl("https://www.instagram.com/cuenta/")).toBeNull();
  });
});

describe("embedUrl", () => {
  it("usa reproductores oficiales (YouTube sin cookies, TikTok Embed Player)", () => {
    expect(embedUrl("youtube", "abc", "")).toContain("youtube-nocookie.com/embed/abc");
    expect(embedUrl("tiktok", "123", "")).toContain("tiktok.com/player/v1/123");
    expect(embedUrl("instagram", "C1", "https://www.instagram.com/reel/C1/")).toBe("https://www.instagram.com/reel/C1/embed/");
    expect(embedUrl("youtube", "mockyoutube1", "")).toBeNull();
  });
});

describe("normalizePlan", () => {
  const base: SearchPlan = {
    summary: "x",
    keywords_es: ["  antes y después pintura ", "antes y después pintura", ""],
    keywords_en: [],
    synonyms: [],
    hashtags: ["#Pintura", "pintura casa", "##Antesydespues"],
    reference_accounts: [
      { platform: "instagram", handle: "@pintureria_ok" },
      { platform: "instagram", handle: "https://www.instagram.com/otra.cuenta/" },
      { platform: "instagram", handle: "no válido!!" },
    ],
    providers: ["youtube", "youtube"],
    period_days: 9999,
    language: "es",
    region: "ar",
    max_duration_seconds: 3,
    min_views: -5,
    relevance_criteria: "y",
  };

  it("limpia duplicados, hashtags, handles y rangos", () => {
    const p = normalizePlan(base);
    expect(p.keywords_es).toEqual(["antes y después pintura"]);
    expect(p.hashtags).toEqual(["pintura", "pinturacasa", "antesydespues"]);
    expect(p.reference_accounts.map((a) => a.handle)).toEqual(["pintureria_ok", "otra.cuenta"]);
    expect(p.providers).toEqual(["youtube"]);
    expect(p.period_days).toBe(365);
    expect(p.region).toBe("AR");
    expect(p.max_duration_seconds).toBe(5);
    expect(p.min_views).toBe(0);
  });
});

describe("extractHashtags", () => {
  it("saca hashtags con acentos y sin duplicados", () => {
    expect(extractHashtags("Mirá esto #Pintura #pintura #DíaDeLaMadre!")).toEqual(["pintura", "díadelamadre"]);
  });
});
