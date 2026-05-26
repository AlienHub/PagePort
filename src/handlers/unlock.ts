import type { Context } from "hono";
import { decryptHtml } from "../lib/crypto";
import { isSafeId } from "../lib/ids";
import { getPage, markExpired, touchRender } from "../lib/pages";
import { errorJson } from "../lib/responses";
import { isExpired } from "../lib/time";
import type { AppBindings } from "../lib/types";
import { normalizePassword, readJsonObject } from "../lib/validation";

export async function unlockHandler(c: Context<AppBindings>) {
  const id = c.req.param("id") ?? "";
  if (!isSafeId(id)) return errorJson(c, 404, "Page not found");

  const payload = await readJsonObject(c.req.raw);
  if (!payload) return errorJson(c, 400, "Request body must be a JSON object");

  const password = normalizePassword(payload.password);
  if (!password) return errorJson(c, 401, "Password is required");

  const page = await getPage(c.env, id);
  if (!page) return errorJson(c, 404, "Page not found");
  if (page.status !== "active") return errorJson(c, page.status === "expired" ? 410 : 404, "Page unavailable");
  if (isExpired(page.expires_at)) {
    await markExpired(c.env, page);
    return errorJson(c, 410, "Page expired");
  }
  if (page.mode !== "encrypted") return errorJson(c, 400, "Page is not encrypted");
  if (!page.encryption_salt || !page.encryption_iv || !page.encryption_iterations) {
    return errorJson(c, 500, "Page encryption metadata is missing");
  }

  const object = await c.env.PAGE_BUCKET.get(page.object_key);
  if (!object) return errorJson(c, 404, "Page content not found");

  try {
    const html = await decryptHtml(
      await object.arrayBuffer(),
      password,
      page.encryption_salt,
      page.encryption_iv,
      page.encryption_iterations
    );
    await touchRender(c.env, id);
    return c.json({ html });
  } catch {
    return errorJson(c, 401, "Invalid password");
  }
}
