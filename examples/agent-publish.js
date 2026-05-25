import { readFile } from "node:fs/promises";

const endpoint = process.env.PUBLISH_ENDPOINT || "http://127.0.0.1:4123/api/v1/artifacts";
const htmlPath = process.argv[2] || new URL("./sample-artifact.html", import.meta.url);
const title = process.argv[3] || "AI Weekly Brief";
const token = process.env.PAGEPORT_TOKEN;

const html = await readFile(htmlPath, "utf8");

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {})
  },
  body: JSON.stringify({
    title,
    html,
    visibility: "public",
    ttlHours: 168,
    source: {
      agent: "local-dev-agent",
      runId: `run_${Date.now()}`
    }
  })
});

const result = await response.json();

if (!response.ok) {
  console.error(result);
  process.exit(1);
}

console.log(result.shareUrl);
console.log(JSON.stringify(result, null, 2));
