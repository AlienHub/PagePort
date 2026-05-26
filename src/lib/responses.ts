import type { Context } from "hono";

const SECURITY_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer"
} as const;

export function withSecurityHeaders(headers: Headers): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
}

export function errorJson(c: Context, status: 400 | 401 | 403 | 404 | 409 | 410 | 413 | 500, error: string) {
  return c.json({ error }, status);
}

export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

export function textHtmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
