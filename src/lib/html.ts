const TITLE_MAX = 180;

export function maxHtmlBytes(env: { MAX_HTML_BYTES?: string }): number {
  const parsed = Number(env.MAX_HTML_BYTES);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 2_000_000;
}

export function htmlSizeBytes(html: string): number {
  return new TextEncoder().encode(html).byteLength;
}

export function normalizeHtml(html: unknown, limitBytes: number): string | null {
  if (typeof html !== "string" || !html.trim()) return null;
  if (htmlSizeBytes(html) > limitBytes) return null;
  const trimmed = html.trim();
  const lower = trimmed.slice(0, 1000).toLowerCase();
  if (lower.includes("<html") || lower.includes("<!doctype")) return trimmed;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${trimmed}</body></html>`;
}

export function normalizeTitle(title: unknown): string {
  const normalized = String(title ?? "").trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, TITLE_MAX) : "Untitled HTML Share";
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
