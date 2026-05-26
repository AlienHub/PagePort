import { readFile } from "node:fs/promises";

const endpoint = process.env.PAGEPORT_ENDPOINT || "http://127.0.0.1:8787/v1/publish";
const token = process.env.PAGEPORT_AGENT_TOKEN;
const htmlPath = process.argv[2] || new URL("./sample-artifact.html", import.meta.url);
const title = process.argv[3] || "AI Weekly Brief";
const password = process.env.PAGEPORT_PASSWORD;
const ttlSeconds = Number(process.env.PAGEPORT_TTL_SECONDS || 604800);

if (!token) {
  console.error("Set PAGEPORT_AGENT_TOKEN before publishing.");
  process.exit(1);
}

const html = await readFile(htmlPath, "utf8");

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "authorization": `Bearer ${token}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    title,
    html,
    ttl_seconds: ttlSeconds,
    ...(password ? { password } : {}),
    metadata: {
      agent: "local-dev-agent",
      run_id: `run_${Date.now()}`
    }
  })
});

const result = await response.json();

if (!response.ok) {
  console.error(result);
  process.exit(1);
}

console.log(result.url);
console.log(JSON.stringify(result, null, 2));
