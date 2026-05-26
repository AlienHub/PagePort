import type { Context } from "hono";
import { isSafeId } from "../lib/ids";
import { getPage } from "../lib/pages";
import { errorJson } from "../lib/responses";
import { nowIso } from "../lib/time";
import type { AppBindings } from "../lib/types";

export async function deletePageHandler(c: Context<AppBindings>) {
  const id = c.req.param("id") ?? "";
  if (!isSafeId(id)) return errorJson(c, 404, "Page not found");

  const agent = c.var.agent;
  const page = await getPage(c.env, id);
  if (!page || page.agent_id !== agent.id) return errorJson(c, 404, "Page not found");
  if (page.status !== "active") return c.json({ id, status: page.status });

  await c.env.PAGE_BUCKET.delete(page.object_key);
  await c.env.DB.prepare(
    "UPDATE pages SET status = 'deleted', deleted_at = ? WHERE id = ? AND agent_id = ?"
  ).bind(nowIso(), id, agent.id).run();

  return c.json({ id, status: "deleted" });
}
