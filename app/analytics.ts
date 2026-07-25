// Client-side event tracking. Everything here is best-effort and silent:
// a failed send must never interrupt a brew.

export type BrewEventName = "brew_start" | "brew_complete" | "brew_abandon";

export type BrewEvent = {
  event: BrewEventName;
  recipeId: string;
  brewer: string;
  milk: boolean;
  stepType: string;
  session: string;
  elapsed: number;
  stepIndex: number;
  totalSteps: number;
  progress: number;
  dose: number;
};

const eventsPath = "/api/events";

// One id per page load. Enough to stitch a brew_start to its terminal event
// without setting a cookie or storing anything on the device.
let sessionId = "";

export function analyticsSession() {
  if (!sessionId) {
    sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
  }
  return sessionId;
}

// `keepalive` lets the request survive the page starting to unload, which is
// exactly the case that matters for abandonment.
export function trackBrewEvent(event: BrewEvent) {
  try {
    void fetch(eventsPath, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // no network — drop it
  }
}

// For pagehide specifically. sendBeacon is the only send that browsers
// guarantee during unload; fetch+keepalive is the fallback where it is missing.
export function beaconBrewEvent(event: BrewEvent) {
  try {
    const body = JSON.stringify(event);
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(eventsPath, blob)) return;
    }
  } catch {
    // fall through
  }
  trackBrewEvent(event);
}
