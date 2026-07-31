import { env } from "cloudflare:workers";

// Workers Analytics Engine binding. Optional on purpose: local dev and any
// deploy made before the binding exists should degrade to a no-op rather than
// throwing, because analytics must never break a brew.
type AnalyticsEngineDataset = {
  writeDataPoint(event: {
    blobs?: (string | null)[];
    doubles?: number[];
    indexes?: string[];
  }): void;
};

type EventEnv = { ANALYTICS?: AnalyticsEngineDataset };

// Only these are accepted. An allowlist keeps a stray client from polluting the
// dataset with event names that no query knows about.
const allowedEvents = new Set([
  "brew_start",
  "brew_complete",
  "brew_abandon",
  // Usage events. Same columns; numeric ones sit at zero.
  "library_view",
  "recipe_view",
  "share_open",
  "share_sent",
  "recipe_publish",
]);

type EventPayload = {
  event?: unknown;
  recipeId?: unknown;
  brewer?: unknown;
  milk?: unknown;
  stepType?: unknown;
  session?: unknown;
  elapsed?: unknown;
  stepIndex?: unknown;
  totalSteps?: unknown;
  progress?: unknown;
  dose?: unknown;
};

function str(value: unknown, max = 64) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

// Analytics Engine rejects the whole data point on a non-finite double, so
// everything is clamped to a real number before it goes near the binding.
function num(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

// POST /api/events — record one brew-funnel data point.
// Always answers 204 so a failure here can never surface in the UI.
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as EventPayload;
    const event = str(payload.event, 32);

    if (!allowedEvents.has(event)) {
      return new Response(null, { status: 204 });
    }

    const analytics = (env as unknown as EventEnv).ANALYTICS;
    if (!analytics) {
      return new Response(null, { status: 204 });
    }

    // Column layout is positional and permanent — see docs/analytics.md.
    // Changing an existing position silently corrupts historical queries.
    analytics.writeDataPoint({
      blobs: [
        event, // blob1  event name
        str(payload.recipeId), // blob2  recipe id
        str(payload.brewer, 48), // blob3  brewer
        payload.milk === true ? "milk" : "black", // blob4  milk state
        str(payload.stepType, 32), // blob5  step type at this moment
        str(payload.session, 32), // blob6  per-page-load id, no cookie
      ],
      doubles: [
        num(payload.elapsed), // double1  seconds elapsed
        num(payload.stepIndex, -1), // double2  furthest step index, -1 if none
        num(payload.totalSteps), // double3  steps in the recipe
        num(payload.progress), // double4  elapsed / total, 0..1
        num(payload.dose), // double5  dose actually brewed, post-scaling
      ],
      // The sampling key. Event name means high-volume events get sampled
      // before rare ones, which keeps abandon counts trustworthy.
      indexes: [event],
    });

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}
