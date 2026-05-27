import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          d1Databases: ["DB"],
          r2Buckets: ["PAGE_BUCKET"],
          bindings: {
            GOOGLE_CLIENT_ID: "google-client",
            GOOGLE_CLIENT_SECRET: "google-secret",
            GITHUB_CLIENT_ID: "github-client",
            GITHUB_CLIENT_SECRET: "github-secret"
          }
        }
      }
    }
  }
});
