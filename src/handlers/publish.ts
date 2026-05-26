import type { Context } from "hono";
import { configuredIterations, encryptHtml, sha256Hex } from "../lib/crypto";
import { htmlSizeBytes, maxHtmlBytes, normalizeHtml, normalizeTitle } from "../lib/html";
import { makePageId, objectKeyForPage } from "../lib/ids";
import { errorJson } from "../lib/responses";
import { addSecondsIso, normalizeTtlSeconds, nowIso, ttlConfig } from "../lib/time";
import type { AppBindings } from "../lib/types";
import { normalizeMetadata, normalizePassword, readPublishPayload } from "../lib/validation";

export async function publishHandler(c: Context<AppBindings>) {
  let payload;
  const htmlLimit = maxHtmlBytes(c.env);
  try {
    payload = await readPublishPayload(c.req.raw, htmlLimit);
  } catch {
    return errorJson(c, 413, `Payload too large. HTML is limited to ${htmlLimit} bytes.`);
  }

  if (!payload) return errorJson(c, 400, "Request body must be a JSON object");

  const html = normalizeHtml(payload.html, htmlLimit);
  if (!html) return errorJson(c, 400, `html is required and must be at most ${htmlLimit} bytes`);

  const ttlSeconds = normalizeTtlSeconds(payload.ttl_seconds, c.env);
  if (!ttlSeconds) {
    const { minTtl, maxTtl } = ttlConfig(c.env);
    return errorJson(c, 400, `ttl_seconds must be an integer between ${minTtl} and ${maxTtl}`);
  }

  const password = normalizePassword(payload.password);
  const mode = password ? "encrypted" : "public";
  const id = makePageId();
  const objectKey = objectKeyForPage(id);
  const createdAt = nowIso();
  const expiresAt = addSecondsIso(ttlSeconds);
  const sizeBytes = htmlSizeBytes(html);
  const sha256 = await sha256Hex(html);
  const title = normalizeTitle(payload.title);
  const metadataJson = normalizeMetadata(payload.metadata);
  const agent = c.var.agent;

  let body: string | Uint8Array = html;
  let encryptionSalt: string | null = null;
  let encryptionIv: string | null = null;
  let encryptionKdf: string | null = null;
  let encryptionIterations: number | null = null;

  if (mode === "encrypted") {
    const encrypted = await encryptHtml(html, password, configuredIterations(c.env));
    body = encrypted.ciphertext;
    encryptionSalt = encrypted.salt;
    encryptionIv = encrypted.iv;
    encryptionKdf = "PBKDF2-HMAC-SHA-256/AES-256-GCM";
    encryptionIterations = encrypted.iterations;
  }

  await c.env.PAGE_BUCKET.put(objectKey, body, {
    httpMetadata: {
      contentType: mode === "public" ? "text/html; charset=utf-8" : "application/octet-stream"
    },
    customMetadata: { pageId: id, mode }
  });

  await c.env.DB.prepare(
    `INSERT INTO pages (
      id, agent_id, title, mode, status, object_key, sha256, size_bytes, expires_at,
      created_at, deleted_at, encryption_salt, encryption_iv, encryption_kdf,
      encryption_iterations, render_count, last_viewed_at, metadata_json
    ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 0, NULL, ?)`
  ).bind(
    id,
    agent.id,
    title,
    mode,
    objectKey,
    sha256,
    sizeBytes,
    expiresAt,
    createdAt,
    encryptionSalt,
    encryptionIv,
    encryptionKdf,
    encryptionIterations,
    metadataJson
  ).run();

  const origin = c.env.PUBLIC_ORIGIN || new URL(c.req.url).origin;
  return c.json({
    id,
    url: `${origin}/v/${id}`,
    mode,
    expires_at: expiresAt,
    size_bytes: sizeBytes,
    sha256
  }, 201);
}
