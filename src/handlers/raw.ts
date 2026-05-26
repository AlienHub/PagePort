import type { Context } from "hono";
import { isSafeId } from "../lib/ids";
import { getPage, markExpired, touchRender } from "../lib/pages";
import { errorJson, textHtmlResponse } from "../lib/responses";
import { isExpired } from "../lib/time";
import type { AppBindings } from "../lib/types";

export async function rawHandler(c: Context<AppBindings>) {
  const id = c.req.param("id") ?? "";
  if (!isSafeId(id)) return errorJson(c, 404, "Page not found");

  const page = await getPage(c.env, id);
  if (!page) return errorJson(c, 404, "Page not found");
  if (page.status !== "active") return errorJson(c, page.status === "expired" ? 410 : 404, "Page unavailable");
  if (isExpired(page.expires_at)) {
    await markExpired(c.env, page);
    return errorJson(c, 410, "Page expired");
  }
  if (page.mode !== "public") return errorJson(c, 403, "Encrypted pages are not available through /raw");

  const object = await c.env.PAGE_BUCKET.get(page.object_key);
  if (!object) return errorJson(c, 404, "Page content not found");

  await touchRender(c.env, id);
  return textHtmlResponse(await object.text());
}
