import type { Env, Page } from "./types";
import { isExpired, nowIso } from "./time";

export async function getPage(env: Env, id: string): Promise<Page | null> {
  return env.DB.prepare(
    `SELECT id, agent_id, title, mode, status, object_key, sha256, size_bytes, expires_at,
      created_at, deleted_at, encryption_salt, encryption_iv, encryption_kdf,
      encryption_iterations, render_count, last_viewed_at, metadata_json
     FROM pages WHERE id = ? LIMIT 1`
  ).bind(id).first<Page>();
}

export async function markExpired(env: Env, page: Page): Promise<void> {
  if (page.status !== "active" || !isExpired(page.expires_at)) return;
  await env.PAGE_BUCKET.delete(page.object_key);
  await env.DB.prepare("UPDATE pages SET status = 'expired' WHERE id = ? AND status = 'active'").bind(page.id).run();
}

export async function touchRender(env: Env, id: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE pages SET render_count = render_count + 1, last_viewed_at = ? WHERE id = ?"
  ).bind(nowIso(), id).run();
}
