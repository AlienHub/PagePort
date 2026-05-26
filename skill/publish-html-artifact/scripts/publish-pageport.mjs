#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const htmlPath = process.argv[2];
const title = process.argv[3] || "HTML artifact";
const endpoint = process.env.PAGEPORT_ENDPOINT ||
  (process.env.PAGEPORT_ORIGIN ? `${process.env.PAGEPORT_ORIGIN.replace(/\/$/, "")}/v1/publish` : "");
const token = process.env.PAGEPORT_AGENT_TOKEN;
const ttlSeconds = Number(process.env.PAGEPORT_TTL_SECONDS || 604800);
const password = process.env.PAGEPORT_PASSWORD;

if (!htmlPath) {
  console.error("Usage: node scripts/publish-pageport.mjs path/to/artifact.html \"Artifact title\"");
  process.exit(2);
}

if (!endpoint) {
  console.error("Set PAGEPORT_ENDPOINT or PAGEPORT_ORIGIN before publishing.");
  process.exit(2);
}

if (!token) {
  console.error("Set PAGEPORT_AGENT_TOKEN before publishing.");
  process.exit(2);
}

if (!Number.isInteger(ttlSeconds)) {
  console.error("PAGEPORT_TTL_SECONDS must be an integer when provided.");
  process.exit(2);
}

const html = await readFile(htmlPath, "utf8");

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    title,
    html,
    ttl_seconds: ttlSeconds,
    ...(password ? { password } : {}),
    metadata: {
      agent: "codex",
      source: "publish-html-artifact-skill"
    }
  })
});

const text = await response.text();
let result;
try {
  result = text ? JSON.parse(text) : {};
} catch {
  result = { error: text || `HTTP ${response.status}` };
}

if (!response.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
