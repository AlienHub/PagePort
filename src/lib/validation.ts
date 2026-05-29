export type PublishPayload = {
  html?: unknown;
  title?: unknown;
  ttl_seconds?: unknown;
  never_expires?: unknown;
  password?: unknown;
  metadata?: unknown;
};

export async function readPublishPayload(request: Request, maxBytes: number): Promise<PublishPayload | null> {
  const body = await readBodyWithLimit(request, maxBytes + 64_000);
  try {
    const parsed = JSON.parse(body || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function readJsonObject(request: Request, maxBytes = 16_384): Promise<Record<string, unknown> | null> {
  const body = await readBodyWithLimit(request, maxBytes);
  try {
    const parsed = JSON.parse(body || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function normalizePassword(password: unknown): string {
  if (password === undefined || password === null) return "";
  return String(password);
}

export function normalizeMetadata(metadata: unknown): string | null {
  if (metadata === undefined || metadata === null) return null;
  try {
    return JSON.stringify(metadata);
  } catch {
    return null;
  }
}

async function readBodyWithLimit(request: Request, maxBytes: number): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      size += value.byteLength;
      if (size > maxBytes) throw new Error("Payload too large");
      chunks.push(value);
    }
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}
