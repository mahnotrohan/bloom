import { env } from "cloudflare:workers";

// Reads the brew/usage funnel back out of Workers Analytics Engine.
//
// Analytics Engine has no dashboard, only a SQL API, and that API needs an
// account-scoped token. Keeping the query server-side means the token lives in
// a Worker secret and never reaches the browser — /stats can stay a plain URL.
type StatsEnv = {
  CF_ACCOUNT_ID?: string;
  CF_ANALYTICS_TOKEN?: string;
};

const dataset = "bloom_events";

// Every aggregate weights by _sample_interval; without it the numbers read low
// as soon as sampling starts. See docs/analytics.md.
function queries(days: number) {
  const since = `timestamp >= NOW() - INTERVAL '${days}' DAY`;
  return {
    // Counts per event name — the funnel plus the usage events.
    totals: `SELECT blob1 AS event, SUM(_sample_interval) AS count
             FROM ${dataset} WHERE ${since} GROUP BY event`,

    // Most-opened recipes, with how many of those opens became brews.
    recipes: `SELECT blob2 AS recipe_id,
                     SUM(IF(blob1 = 'recipe_view', _sample_interval, 0)) AS views,
                     SUM(IF(blob1 = 'brew_start', _sample_interval, 0)) AS brews
              FROM ${dataset}
              WHERE ${since} AND blob2 != ''
              GROUP BY recipe_id
              ORDER BY views DESC
              LIMIT 12`,

    // Where brews end: which step, and how far in.
    dropoff: `SELECT blob5 AS step_type,
                     SUM(_sample_interval) AS ended_here,
                     SUM(_sample_interval * double4) / SUM(_sample_interval) AS avg_progress
              FROM ${dataset}
              WHERE ${since} AND blob1 = 'brew_abandon' AND blob5 != ''
              GROUP BY step_type
              ORDER BY ended_here DESC
              LIMIT 10`,

    // Daily activity, so the page can show a trend rather than one number.
    daily: `SELECT toDate(timestamp) AS day, blob1 AS event,
                   SUM(_sample_interval) AS count
            FROM ${dataset} WHERE ${since}
            GROUP BY day, event
            ORDER BY day`,
  };
}

async function runQuery(accountId: string, token: string, sql: string) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: sql,
    },
  );

  if (!response.ok) {
    throw new Error(`Analytics query failed (${response.status})`);
  }

  const body = (await response.json()) as { data?: Record<string, unknown>[] };
  return body.data ?? [];
}

// GET /api/stats?days=30
export async function GET(request: Request) {
  const config = env as unknown as StatsEnv;
  const accountId = config.CF_ACCOUNT_ID;
  const token = config.CF_ANALYTICS_TOKEN;

  if (!accountId || !token) {
    return Response.json(
      {
        error:
          "Stats are not configured yet. Set the CF_ACCOUNT_ID and CF_ANALYTICS_TOKEN secrets on the Worker.",
      },
      { status: 501 },
    );
  }

  const requested = Number(new URL(request.url).searchParams.get("days"));
  const days = Number.isFinite(requested) && requested > 0 && requested <= 90
    ? Math.round(requested)
    : 30;

  try {
    const sql = queries(days);
    const [totals, recipes, dropoff, daily] = await Promise.all([
      runQuery(accountId, token, sql.totals),
      runQuery(accountId, token, sql.recipes),
      runQuery(accountId, token, sql.dropoff),
      runQuery(accountId, token, sql.daily),
    ]);

    return Response.json(
      { days, totals, recipes, dropoff, daily },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Stats unavailable" },
      { status: 500 },
    );
  }
}
