import { cleanupExpiredPages } from "./handlers/cleanup";
import { app } from "./router";
import type { Env } from "./lib/types";

export default {
  fetch: app.fetch,
  scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(cleanupExpiredPages(env));
  }
};
