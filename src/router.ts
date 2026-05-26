import { Hono } from "hono";
import { requireAgent } from "./lib/auth";
import { withSecurityHeaders } from "./lib/responses";
import type { AppBindings } from "./lib/types";
import { bootstrapAgentHandler, bootstrapStatusHandler } from "./handlers/bootstrap";
import { deletePageHandler } from "./handlers/deletePage";
import { publishHandler } from "./handlers/publish";
import { rawHandler } from "./handlers/raw";
import { unlockHandler } from "./handlers/unlock";
import { viewHandler } from "./handlers/view";
import { renderHome } from "./viewer/homeHtml";

export const app = new Hono<AppBindings>();

app.use("*", async (c, next) => {
  await next();
  withSecurityHeaders(c.res.headers);
});

app.get("/", c => {
  const origin = c.env.PUBLIC_ORIGIN || new URL(c.req.url).origin;
  return c.html(renderHome(origin));
});
app.get("/healthz", c => c.json({ ok: true }));
app.get("/favicon.ico", () => new Response(null, { status: 204 }));
app.get("/v1/bootstrap/status", bootstrapStatusHandler);
app.post("/v1/bootstrap/agent", bootstrapAgentHandler);
app.post("/v1/publish", requireAgent, publishHandler);
app.get("/v/:id", viewHandler);
app.get("/raw/:id", rawHandler);
app.post("/v/:id/unlock", unlockHandler);
app.delete("/v1/pages/:id", requireAgent, deletePageHandler);

app.notFound(c => c.json({ error: "Not found" }, 404));
