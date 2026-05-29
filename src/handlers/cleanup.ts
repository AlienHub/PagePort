import type { Env, Page } from "../lib/types";
import { nowIso } from "../lib/time";

export async function cleanupExpiredPages(env: Env): Promise<{ expired: number; deletedObjects: number }> {
  const now = nowIso();
  const pages = await env.DB.prepare(
    `SELECT id, object_key FROM pages
     WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < ?
     LIMIT 100`
  ).bind(now).all<Pick<Page, "id" | "object_key">>();

  const expired = pages.results ?? [];
  let deletedObjects = 0;

  for (const page of expired) {
    await env.PAGE_BUCKET.delete(page.object_key);
    deletedObjects += 1;
    await env.DB.prepare("UPDATE pages SET status = 'expired' WHERE id = ? AND status = 'active'").bind(page.id).run();
  }

  return { expired: expired.length, deletedObjects };
}
