#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const htmlPath = process.argv[2];
const title = process.argv[3] || "HTML artifact";
const configPath = process.env.PAGEPORT_CONFIG || join(homedir(), ".pageport", "config.yaml");
const config = await loadConfig(configPath);
const endpoint = process.env.PAGEPORT_ENDPOINT ||
  config.endpoint ||
  endpointFromOrigin(process.env.PAGEPORT_ORIGIN || config.origin);
const token = process.env.PAGEPORT_AGENT_TOKEN || config.agent_token;
const ttlSeconds = Number(process.env.PAGEPORT_TTL_SECONDS || config.ttl_seconds || config.default_ttl_seconds || 604800);
const password = process.env.PAGEPORT_PASSWORD;

if (!htmlPath) {
  console.error("Usage: node scripts/publish-pageport.mjs path/to/artifact.html \"Artifact title\"");
  process.exit(2);
}

if (!endpoint) {
  console.error(`Set PAGEPORT_ENDPOINT/PAGEPORT_ORIGIN, or add endpoint/origin to ${configPath}.`);
  process.exit(2);
}

if (!token) {
  console.error(`Set PAGEPORT_AGENT_TOKEN, or add agent_token to ${configPath}.`);
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

async function loadConfig(path) {
  try {
    return parseConfig(await readFile(path, "utf8"), path);
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

function parseConfig(source, path) {
  const config = {};
  const allowedKeys = new Set(["endpoint", "origin", "agent_token", "ttl_seconds", "default_ttl_seconds"]);

  source.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const match = trimmed.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) {
      throw new Error(`Invalid PagePort config line ${index + 1} in ${path}. Expected "key: value".`);
    }

    const key = match[1];
    if (!allowedKeys.has(key)) return;
    config[key] = parseScalar(match[2]);
  });

  return config;
}

function parseScalar(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed.replace(/\s+#.*$/, "");
}

function endpointFromOrigin(origin) {
  return origin ? `${origin.replace(/\/$/, "")}/v1/publish` : "";
}
