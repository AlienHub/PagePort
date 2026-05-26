import type { Context } from "hono";
import { isSafeId } from "../lib/ids";
import { getPage, markExpired } from "../lib/pages";
import { errorJson, htmlResponse } from "../lib/responses";
import { isExpired } from "../lib/time";
import type { AppBindings } from "../lib/types";
import { renderViewer } from "../viewer/viewerHtml";

export async function viewHandler(c: Context<AppBindings>) {
  const id = c.req.param("id") ?? "";
  if (!isSafeId(id)) return errorJson(c, 404, "Page not found");

  const page = await getPage(c.env, id);
  if (!page) return errorJson(c, 404, "Page not found");
  if (page.status !== "active") return errorJson(c, page.status === "expired" ? 410 : 404, "Page unavailable");
  if (isExpired(page.expires_at)) {
    await markExpired(c.env, page);
    return errorJson(c, 410, "Page expired");
  }

  return htmlResponse(renderViewer(page));
}
