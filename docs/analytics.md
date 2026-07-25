# Analytics

Bloom writes brew-funnel events to **Workers Analytics Engine**, dataset
`bloom_events`. No third-party script, no cookies, nothing stored on the device.

## How it is wired

| Piece | Where |
| --- | --- |
| Binding `ANALYTICS` → dataset `bloom_events` | `vite.config.ts`, `analytics_engine_datasets` |
| Env type | `worker/index.ts` |
| Write endpoint | `app/api/events/route.ts` (`POST /api/events`) |
| Client sender | `app/analytics.ts` |
| Instrumentation | `BrewMode` in `app/page.tsx` |

The dataset is created on first write — there is nothing to provision in the
dashboard. The binding is optional in code: if it is absent the route returns
`204` and does nothing, so local dev and pre-binding deploys are unaffected.

`POST /api/events` always answers `204`, even on malformed input, and the client
never surfaces failures. Analytics must not be able to break a brew.

## Events

Two data points per brew, not one per step. The terminal event carries the
furthest step reached, which is enough to reconstruct the whole drop-off curve.

| Event | Fires when |
| --- | --- |
| `brew_start` | Someone taps start in brew mode. Re-fires on "Brew again". |
| `brew_complete` | The clock reaches the end of the timeline. |
| `brew_abandon` | They leave mid-brew — closing the tab (`pagehide`) or backing out of brew mode (unmount). |

Exactly one terminal event fires per brew, guarded by `terminalSentRef`.
`brew_abandon` on tab close uses `navigator.sendBeacon`, which is the only send
browsers guarantee during unload; `fetch` with `keepalive` is the fallback.

## Column layout

Analytics Engine columns are **positional and permanent**. `blob1` is whatever
you wrote first, forever. Changing a position silently corrupts every historical
query — append new columns, never reorder or repurpose.

| Column | Meaning |
| --- | --- |
| `blob1` | event name |
| `blob2` | recipe id |
| `blob3` | brewer |
| `blob4` | `milk` or `black` |
| `blob5` | step type at the moment of the event (`Bloom`, `Pour`, `Drawdown`, …) |
| `blob6` | per-page-load id, for stitching start → terminal |
| `double1` | seconds elapsed |
| `double2` | furthest step index, 0-based, `-1` if none reached |
| `double3` | steps in the recipe |
| `double4` | progress, `elapsed / total`, 0–1 |
| `double5` | dose actually brewed, after in-brew scaling |
| `indexes[0]` | event name — the sampling key |

Event name is the sampling key so that high-volume events get sampled before
rare ones, which keeps `brew_abandon` counts trustworthy.

`double5` is worth watching on its own: brew mode lets people scale the dose, so
comparing it against the recipe's own dose shows whether published recipes are
sized the way people actually brew them.

## Querying

Create an API token with **Account Analytics Read**, then:

```bash
curl "https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql" \
  --header "Authorization: Bearer $CF_ANALYTICS_TOKEN" \
  --data "<SQL>"
```

Every aggregate must weight by `_sample_interval` or the numbers will read low
once sampling kicks in.

### Completion rate

```sql
SELECT
  blob1 AS event,
  SUM(_sample_interval) AS brews
FROM bloom_events
WHERE timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY event
```

### Drop-off curve

How many brews got at least as far as each step. `brews_reaching` is cumulative
by construction, since the terminal event records the furthest step.

```sql
SELECT
  double2 AS furthest_step,
  blob5 AS step_type,
  SUM(_sample_interval) AS brews_ending_here,
  SUM(_sample_interval * double4) / SUM(_sample_interval) AS avg_progress
FROM bloom_events
WHERE blob1 IN ('brew_complete', 'brew_abandon')
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY furthest_step, step_type
ORDER BY furthest_step
```

### Which step loses people

```sql
SELECT
  blob5 AS abandoned_during,
  SUM(_sample_interval) AS abandons,
  SUM(_sample_interval * double1) / SUM(_sample_interval) AS avg_seconds_in
FROM bloom_events
WHERE blob1 = 'brew_abandon'
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY abandoned_during
ORDER BY abandons DESC
```

### Do long brews lose people

```sql
SELECT
  blob2 AS recipe,
  SUM(_sample_interval * double3) / SUM(_sample_interval) AS steps,
  SUM(_sample_interval * double4) / SUM(_sample_interval) AS avg_progress,
  SUM(_sample_interval) AS brews
FROM bloom_events
WHERE blob1 IN ('brew_complete', 'brew_abandon')
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY recipe
HAVING brews > 2
ORDER BY avg_progress ASC
```

### Milk vs black demand

```sql
SELECT
  blob4 AS milk,
  SUM(_sample_interval) AS brews
FROM bloom_events
WHERE blob1 = 'brew_start'
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY milk
```

## Limits

- 20 blobs, 20 doubles, **1** index per data point. More than one index and the
  point is silently dropped.
- Blobs total 16 KB per data point; each index max 96 bytes.
- 250 data points per Worker invocation.
- **Retention is three months.** Anything you want to keep longer has to be
  rolled up and stored elsewhere — a monthly snapshot into D1 would do it.
