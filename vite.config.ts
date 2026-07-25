import vinext from "vinext";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2, d1DatabaseName, d1DatabaseId } = hostingConfig as {
  d1: string | null;
  r2: string | null;
  d1DatabaseName?: string;
  d1DatabaseId?: string;
};

// Only emit a real D1 binding once an actual database_id is present.
// This keeps deploys safe before the D1 database is provisioned: the app
// simply falls back to browser localStorage until the binding is real.
const resolvedD1Id =
  d1DatabaseId && d1DatabaseId.trim()
    ? d1DatabaseId.trim()
    : SITE_CREATOR_PLACEHOLDER_DATABASE_ID;
const d1Enabled = Boolean(d1) && resolvedD1Id !== SITE_CREATOR_PLACEHOLDER_DATABASE_ID;

const localBindingConfig = {
  main: "./worker/index.ts",
  workers_dev: true,
  compatibility_flags: ["nodejs_compat"],
  routes: [
    {
      pattern: "bloom.rohanmahnot.space",
      custom_domain: true,
      zone_name: "rohanmahnot.space",
    },
    {
      pattern: "brew-log.rohanmahnot.space",
      custom_domain: true,
      zone_name: "rohanmahnot.space",
    },
  ],
  d1_databases: d1Enabled
    ? [
        {
          binding: d1 as string,
          database_name: d1DatabaseName || "brewlog-db",
          database_id: resolvedD1Id,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
  // Workers Analytics Engine. The dataset is created on first write — there is
  // nothing to provision in the dashboard. See docs/analytics.md for the
  // column layout and the drop-off queries.
  analytics_engine_datasets: [
    {
      binding: "ANALYTICS",
      dataset: "bloom_events",
    },
  ],
};

export default defineConfig({
  plugins: [
    vinext(),
    sites(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      config: localBindingConfig,
    }),
  ],
});
