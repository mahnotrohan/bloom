/* ============================================================================
   Grind — the single source of truth for grind size, grinder conversion and
   recipe translation.

   Extracted from grind-guide.tsx so the guide, the recipe page and the share
   card all agree. The guide used to own these tables privately; it now imports
   them from here.

   The model pivots on MICRONS. Every grinder calibrates to microns once, so a
   conversion is two lookups rather than a grinder-to-grinder mapping. Twenty
   grinders means twenty entries, not 190 pairs.
   ========================================================================== */

export const MIN_MICRONS = 100;
export const MAX_MICRONS = 1500;

/** Descriptive bands with a household reference for each. */
export const bands = [
  { max: 250, label: "Extra fine", like: "powdered sugar" },
  { max: 450, label: "Fine", like: "table salt" },
  { max: 650, label: "Medium-fine", like: "beach sand" },
  { max: 900, label: "Medium", like: "coarse sand" },
  { max: 1100, label: "Medium-coarse", like: "raw / demerara sugar" },
  { max: MAX_MICRONS, label: "Coarse", like: "flaky sea salt" },
] as const;

/**
 * Bloom stores grind as one of five values. This maps the continuum back onto
 * them so the guide can tell you what to pick in the builder.
 */
export const bloomBuckets = [
  { max: 420, label: "Fine" },
  { max: 660, label: "Medium-Fine" },
  { max: 900, label: "Medium" },
  { max: 1120, label: "Medium-Coarse" },
  { max: MAX_MICRONS, label: "Coarse" },
] as const;

/** The five stored values, coarsest-last. Order is load-bearing — see below. */
export const bloomBucketOrder = [
  "Fine",
  "Medium-Fine",
  "Medium",
  "Medium-Coarse",
  "Coarse",
] as const;

export type BloomBucket = (typeof bloomBucketOrder)[number];

export type Method = {
  name: string;
  low: number;
  high: number;
  /** Shown when the method is the closest match to the current setting. */
  note: string;
};

/**
 * Working ranges, not laws. Where sources disagree the range is widened rather
 * than averaged — AeroPress genuinely spans espresso-fine to French-press-coarse
 * depending on the recipe.
 */
export const methods: Method[] = [
  { name: "Ibrik / Turkish", low: 100, high: 250, note: "Finer than espresso — flour-like, no grit between the fingers." },
  { name: "Espresso", low: 200, high: 380, note: "Dial by shot time, not by number. Clumps when squeezed." },
  { name: "Moka pot", low: 350, high: 500, note: "A touch coarser than espresso, or the basket chokes." },
  { name: "SIF (South Indian filter)", low: 400, high: 620, note: "Fine but free-flowing; too fine and the drip stalls overnight." },
  { name: "AeroPress", low: 450, high: 900, note: "Widest range of any brewer — fine for short steeps, coarse for long ones." },
  { name: "Cafec Deep 27", low: 550, high: 750, note: "Deep cone wants a little finer than a standard V60." },
  { name: "V60", low: 600, high: 850, note: "Drawdown around 2:30–3:30 for a 15 g brew is the tell." },
  { name: "Origami Dripper", low: 650, high: 900, note: "Ribs speed drawdown — go a step finer than you'd expect." },
  { name: "Kalita Wave", low: 700, high: 900, note: "Flat bed is forgiving; coarser than a cone at the same dose." },
  { name: "Chemex", low: 800, high: 1000, note: "Thick filter is slow, so the grind has to open up." },
  { name: "French Press", low: 1000, high: 1250, note: "Coarse enough that fines don't slip past the mesh." },
  { name: "Cold brew", low: 1150, high: 1500, note: "Coarsest of all — hours of contact do the extracting." },
];

/**
 * Bloom's brewer list maps onto the method ranges above. The three "Other"
 * options fall back to the closest archetype so a free-typed brewer still
 * translates instead of silently giving up.
 */
export const brewerMethod: Record<string, string> = {
  "V60": "V60",
  "French Press": "French Press",
  "AeroPress": "AeroPress",
  "SIF": "SIF (South Indian filter)",
  "Origami Dripper": "Origami Dripper",
  "Kalita Wave": "Kalita Wave",
  "Cafec Deep 27": "Cafec Deep 27",
  "Chemex": "Chemex",
  // Free-typed brewers that exist in the library. `brewer` is not really a
  // closed set — the builder allows "Other…" — so these are mapped to the
  // closest archetype by geometry: conical cones behave like a V60, flat beds
  // like a Kalita.
  "SOLO": "V60",
  "Solo Dripper": "V60",
  "GINA": "V60",
  "Orea": "Kalita Wave",
  "Orea V4": "Kalita Wave",
  "Flower Dripper": "Kalita Wave",
  "December Dripper": "V60",
  "Switch": "V60",
  "Hario Switch": "V60",
  "Clever": "V60",
  "Moka": "Moka pot",
  "Moka Pot": "Moka pot",
  "Espresso": "Espresso",
  "Cold Brew": "Cold brew",
  "Other - Conical": "V60",
  "Other - Flatbed": "Kalita Wave",
  "Other - Immersion": "French Press",
};

/** Used when a brewer isn't recognised at all — most are pourover cones. */
const FALLBACK_METHOD = "V60";

/**
 * How much we trust a grinder's calibration. This drives what the UI is allowed
 * to claim — never show a confident number off a low-confidence constant.
 *
 *   high       manufacturer-published
 *   medium     several consistent third-party measurements
 *   low        sources disagree, or a single source
 *   unverified placeholder, interpolated from anchors rather than measured
 */
export type Confidence = "high" | "medium" | "low" | "unverified";

export type Grinder =
  | {
      name: string;
      kind: "clicks";
      perClick: number;
      max: number;
      note: string;
      burr: "conical" | "flat";
      confidence: Confidence;
    }
  | {
      name: string;
      kind: "steps";
      anchors: [number, number][];
      min: number;
      max: number;
      step: number;
      note: string;
      burr: "conical" | "flat";
      confidence: Confidence;
    };

/**
 * Hand grinders are close to linear from burr-touch, so a micron-per-click
 * figure is honest. Stepped electrics aren't, so those are interpolated between
 * measured anchor points instead of pretending a formula exists.
 *
 * Sources: 1Zpresso and KINGrinder publish per-click figures directly;
 * Comandante's ~30 um/click is widely corroborated. Timemore is the weak spot —
 * published figures range from 30 to 80 um/click, so it is deliberately marked
 * low and is the first thing real brew data should correct.
 */
export const grinders: Grinder[] = [
  { name: "Comandante C40", kind: "clicks", perClick: 30, max: 50, note: "~30 µm / click", burr: "conical", confidence: "high" },
  { name: "Comandante C40 + Red Clix", kind: "clicks", perClick: 15, max: 100, note: "~15 µm / click", burr: "conical", confidence: "medium" },
  { name: "1Zpresso K-Ultra", kind: "clicks", perClick: 12.5, max: 130, note: "12.5 µm / click", burr: "conical", confidence: "high" },
  { name: "1Zpresso JX-Pro", kind: "clicks", perClick: 12.5, max: 130, note: "12.5 µm / click", burr: "conical", confidence: "high" },
  { name: "1Zpresso JX", kind: "clicks", perClick: 25, max: 60, note: "25 µm / click", burr: "conical", confidence: "high" },
  { name: "1Zpresso K-Plus", kind: "clicks", perClick: 22, max: 90, note: "22 µm / click", burr: "conical", confidence: "high" },
  { name: "1Zpresso K-Pro", kind: "clicks", perClick: 22, max: 90, note: "22 µm / click", burr: "conical", confidence: "medium" },
  { name: "1Zpresso Q2", kind: "clicks", perClick: 25, max: 60, note: "25 µm / click", burr: "conical", confidence: "medium" },
  { name: "Timemore C2 / C3", kind: "clicks", perClick: 30, max: 50, note: "~30 µm / click", burr: "conical", confidence: "low" },
  { name: "Kingrinder K6", kind: "clicks", perClick: 16, max: 120, note: "16 µm / click", burr: "conical", confidence: "high" },
  { name: "Kingrinder K4", kind: "clicks", perClick: 16, max: 120, note: "16 µm / click", burr: "conical", confidence: "high" },
  { name: "Kingrinder K2", kind: "clicks", perClick: 18, max: 100, note: "~18 µm / click", burr: "conical", confidence: "medium" },
  {
    name: "Baratza Encore",
    kind: "steps",
    anchors: [
      [250, 3],
      [450, 9],
      [700, 15],
      [900, 21],
      [1100, 29],
      [1400, 38],
    ],
    min: 1,
    max: 40,
    step: 1,
    note: "40 stepped positions",
    burr: "conical",
    confidence: "unverified",
  },
  {
    name: "Fellow Ode Gen 2",
    kind: "steps",
    anchors: [
      [400, 1.5],
      [600, 2.5],
      [800, 4],
      [1000, 6],
      [1200, 8],
      [1400, 10.5],
    ],
    min: 1,
    max: 11,
    step: 0.5,
    note: "11 marked stops, half-steps usable",
    burr: "flat",
    confidence: "unverified",
  },
];

export const grinderNames = grinders.map((g) => g.name);

export function findGrinder(name: string | undefined | null): Grinder | null {
  if (!name) return null;
  const target = name.trim().toLowerCase();
  if (!target) return null;
  return (
    grinders.find((g) => g.name.toLowerCase() === target) ??
    // Tolerate "Comandante" for "Comandante C40" and similar partial entries,
    // since `grinder` on a recipe is free text typed by whoever published it.
    grinders.find((g) => g.name.toLowerCase().startsWith(target)) ??
    grinders.find((g) => target.startsWith(g.name.toLowerCase())) ??
    null
  );
}

export function bandFor(microns: number) {
  return bands.find((b) => microns <= b.max) ?? bands[bands.length - 1];
}

export function bloomLabelFor(microns: number): BloomBucket {
  return (bloomBuckets.find((b) => microns <= b.max) ?? bloomBuckets[bloomBuckets.length - 1])
    .label as BloomBucket;
}

/** Distance from a range, used to rank which brewers actually fit. */
export function distanceFromRange(microns: number, low: number, high: number) {
  if (microns < low) return low - microns;
  if (microns > high) return microns - high;
  return 0;
}

/**
 * The method whose working range we should read a qualitative grind against.
 * `recognised` is false when we fell back, so the caller can say so rather than
 * quietly presenting a guess as fact.
 */
export function methodFor(brewer: string): { method: Method; recognised: boolean } | null {
  const key = (brewer ?? "").trim();
  const mapped = brewerMethod[key] ?? key;
  const direct = methods.find((m) => m.name.toLowerCase() === mapped.toLowerCase());
  if (direct) return { method: direct, recognised: true };

  // Loose match, so "Orea V4 flat" or "V60 plastic" still land somewhere sane.
  const loose = methods.find(
    (m) =>
      key.toLowerCase().includes(m.name.toLowerCase()) ||
      m.name.toLowerCase().includes(key.toLowerCase()),
  );
  if (key && loose) return { method: loose, recognised: true };

  const fallback = methods.find((m) => m.name === FALLBACK_METHOD);
  return fallback ? { method: fallback, recognised: false } : null;
}

export function settingFor(grinder: Grinder, microns: number) {
  if (grinder.kind === "clicks") {
    const raw = microns / grinder.perClick;
    if (raw > grinder.max) return null;
    return { value: Math.round(raw), unit: "clicks" as const };
  }
  const { anchors } = grinder;
  if (microns <= anchors[0][0]) {
    return microns < anchors[0][0] * 0.75 ? null : { value: anchors[0][1], unit: "setting" as const };
  }
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (microns <= x1) {
      const t = (microns - x0) / (x1 - x0);
      const raw = y0 + t * (y1 - y0);
      const snapped = Math.round(raw / grinder.step) * grinder.step;
      const clamped = Math.min(grinder.max, Math.max(grinder.min, snapped));
      return { value: Number(clamped.toFixed(1)), unit: "setting" as const };
    }
  }
  return { value: grinder.max, unit: "setting" as const };
}

/* ---------------------------------------------------------------------------
   Turning a recipe's grind into microns

   A recipe expresses grind one of two ways, and they are very different in
   how much they tell us:

   1. `grinder` + `clicks`  — an actual measurement. Convert directly.
   2. `grind` alone         — a word: "Fine", "Medium". Nearly all published
                              recipes are this, so it is the important case.

   The subtlety with (2): "Fine" is relative to the brewer. Bloom's absolute
   Fine bucket tops out at 420 um, but no V60 is brewed at 420 um — the V60
   working range is 600-850. A V60 recipe marked "Fine" means *fine for a V60*.
   So the five buckets are mapped ordinally onto the brewer's own range rather
   than read as absolute microns.
   ------------------------------------------------------------------------- */

export type MicronRange = {
  min: number;
  max: number;
  mid: number;
  confidence: Confidence;
  basis: "measured" | "qualitative";
  sourceBurr: "conical" | "flat" | null;
  /** True when the brewer wasn't recognised and a cone's range was assumed. */
  brewerGuessed?: boolean;
};

export function bucketWithinMethod(bucket: string, method: Method): MicronRange {
  const index = Math.max(
    0,
    bloomBucketOrder.indexOf(bucket as BloomBucket),
  );
  const slices = bloomBucketOrder.length;
  const span = method.high - method.low;
  const min = Math.round(method.low + (span * index) / slices);
  const max = Math.round(method.low + (span * (index + 1)) / slices);
  return {
    min,
    max,
    mid: Math.round((min + max) / 2),
    confidence: "low",
    basis: "qualitative",
    sourceBurr: null,
  };
}

export type GrindSource = {
  brewer: string;
  grind?: string;
  grinder?: string;
  clicks?: string;
};

export function micronsForRecipe(recipe: GrindSource): MicronRange | null {
  const rawClicks = String(recipe.clicks ?? "").trim();

  // Best possible input: the publisher already gave microns ("630 microns",
  // "630µm"). No conversion needed and no grinder involved, so this is exact.
  if (/micron|µm|um\b/i.test(rawClicks)) {
    const direct = Number.parseFloat(rawClicks.replace(/[^\d.]/g, ""));
    if (Number.isFinite(direct) && direct > 0) {
      return {
        min: Math.round(direct - 25),
        max: Math.round(direct + 25),
        mid: Math.round(direct),
        confidence: "high",
        basis: "measured",
        sourceBurr: null,
      };
    }
  }

  // Measured path — the publisher told us their grinder and click count.
  const sourceGrinder = findGrinder(recipe.grinder);
  const clicks = Number.parseFloat(rawClicks.replace(/[^\d.]/g, ""));
  if (sourceGrinder && Number.isFinite(clicks) && clicks > 0) {
    if (sourceGrinder.kind === "clicks") {
      const mid = clicks * sourceGrinder.perClick;
      const half = sourceGrinder.perClick / 2;
      return {
        min: Math.round(mid - half),
        max: Math.round(mid + half),
        mid: Math.round(mid),
        confidence: sourceGrinder.confidence,
        basis: "measured",
        sourceBurr: sourceGrinder.burr,
      };
    }
    // Stepped grinder: invert the anchor curve.
    const { anchors } = sourceGrinder;
    for (let i = 0; i < anchors.length - 1; i += 1) {
      const [x0, y0] = anchors[i];
      const [x1, y1] = anchors[i + 1];
      if (clicks <= y1) {
        const t = (clicks - y0) / (y1 - y0);
        const mid = Math.round(x0 + t * (x1 - x0));
        return {
          min: mid - 40,
          max: mid + 40,
          mid,
          confidence: sourceGrinder.confidence,
          basis: "measured",
          sourceBurr: sourceGrinder.burr,
        };
      }
    }
  }

  // Qualitative path — a word, interpreted relative to the brewer.
  const resolved = methodFor(recipe.brewer);
  if (recipe.grind && resolved) {
    const range = bucketWithinMethod(recipe.grind, resolved.method);
    return resolved.recognised
      ? range
      : { ...range, confidence: "unverified", brewerGuessed: true };
  }

  return null;
}

/**
 * Why a recipe couldn't be translated. Surfaced to the reader, because a panel
 * that silently shows the publisher's own numbers under a "your grinder" picker
 * looks broken rather than honest.
 */
export function untranslatableReason(recipe: GrindSource): string | null {
  const rawClicks = String(recipe.clicks ?? "").trim();
  const grinderName = (recipe.grinder ?? "").trim();
  if (rawClicks && grinderName && !findGrinder(grinderName)) {
    return `${grinderName} isn't calibrated yet, and this recipe gives no grind description to fall back on.`;
  }
  if (!recipe.grind) return "This recipe doesn't record its grind size.";
  return null;
}

const CONFIDENCE_ORDER: Confidence[] = ["unverified", "low", "medium", "high"];

export function weakest(...levels: (Confidence | undefined | null)[]): Confidence {
  const present = levels.filter(Boolean) as Confidence[];
  if (!present.length) return "unverified";
  return present.sort(
    (a, b) => CONFIDENCE_ORDER.indexOf(a) - CONFIDENCE_ORDER.indexOf(b),
  )[0];
}

export type Translation = {
  ok: boolean;
  /** What to show, already formatted — e.g. "20 clicks (18–22)". */
  display: string | null;
  value: number | null;
  range: [number, number] | null;
  unit: "clicks" | "setting" | null;
  grinderName: string | null;
  microns: MicronRange | null;
  confidence: Confidence;
  caveats: string[];
  reason?: "no-grind-data" | "no-setup" | "out-of-range";
};

/**
 * The whole job: a recipe plus the reader's own grinder, in the reader's units,
 * with an honest confidence and any caveat worth surfacing.
 *
 * Deliberately returns a RANGE. Users forgive a range; they do not forgive a
 * confident number that tastes wrong.
 */
export function translateGrind(
  recipe: GrindSource,
  myGrinderName: string | null | undefined,
): Translation {
  const empty: Translation = {
    ok: false,
    display: null,
    value: null,
    range: null,
    unit: null,
    grinderName: null,
    microns: null,
    confidence: "unverified",
    caveats: [],
  };

  const microns = micronsForRecipe(recipe);
  if (!microns) return { ...empty, reason: "no-grind-data" };

  const target = findGrinder(myGrinderName);
  if (!target) return { ...empty, microns, reason: "no-setup" };

  const mid = settingFor(target, microns.mid);
  if (!mid) {
    return {
      ...empty,
      microns,
      grinderName: target.name,
      reason: "out-of-range",
      caveats: ["This grind falls outside your grinder's range."],
    };
  }

  const lo = settingFor(target, microns.min);
  const hi = settingFor(target, microns.max);
  const low = lo ? lo.value : mid.value;
  const high = hi ? hi.value : mid.value;

  const caveats: string[] = [];
  let confidence = weakest(microns.confidence, target.confidence);

  if (microns.basis === "qualitative") {
    caveats.push(
      "The original recipe described the grind rather than measuring it — treat this as a starting range.",
    );
  }
  if (microns.brewerGuessed) {
    caveats.push(
      `${recipe.brewer || "This brewer"} isn't in the reference list, so a standard cone's range was assumed.`,
    );
  }
  if (microns.sourceBurr && microns.sourceBurr !== target.burr) {
    caveats.push(
      `Published on a ${microns.sourceBurr} burr, yours is ${target.burr}. Same particle size, different spread — expect to adjust.`,
    );
    confidence = weakest(confidence, "low");
  }
  if (target.confidence === "unverified") {
    caveats.push(`${target.name} settings are interpolated, not measured.`);
  }
  if (target.name.startsWith("Timemore")) {
    caveats.push("Timemore's per-click figure is disputed between sources — verify by taste.");
  }

  // "24 clicks (23–25)" for hand grinders, "setting 3.5" for stepped electrics.
  // A bare number reads as nothing at all next to a dose in grams.
  const spread = Math.abs(high - low);
  const core = mid.unit === "clicks" ? `${mid.value} clicks` : `setting ${mid.value}`;
  const display =
    spread >= 1 ? `${core} (${Math.min(low, high)}–${Math.max(low, high)})` : core;

  return {
    ok: true,
    display,
    value: mid.value,
    range: [Math.min(low, high), Math.max(low, high)],
    unit: mid.unit,
    grinderName: target.name,
    microns,
    confidence,
    caveats,
  };
}

/* ---------------------------------------------------------------------------
   Taste loop

   One variable per iteration, on purpose. Changing grind, temperature and
   ratio at once is the most common home-brewing mistake and it teaches nothing.
   ------------------------------------------------------------------------- */

export type Verdict = "sour" | "bitter" | "weak" | "strong" | "good";

export type TasteAdvice = {
  verdict: Verdict;
  diagnosis: string;
  headline: string;
  detail: string;
  /** Suggested grind move in the reader's own units, when we can compute one. */
  grindDelta?: number;
};

export const tasteVerdicts: { id: Verdict; label: string }[] = [
  { id: "sour", label: "Sour or thin" },
  { id: "bitter", label: "Bitter or dry" },
  { id: "weak", label: "Too weak" },
  { id: "strong", label: "Too strong" },
  { id: "good", label: "Just right" },
];

export function tasteAdvice(
  verdict: Verdict,
  myGrinderName: string | null | undefined,
): TasteAdvice {
  const target = findGrinder(myGrinderName);
  // Roughly 50 microns is one useful move — expressed in the user's clicks.
  const clicksFor50 =
    target && target.kind === "clicks" ? Math.max(1, Math.round(50 / target.perClick)) : 2;

  switch (verdict) {
    case "sour":
      return {
        verdict,
        diagnosis: "Under-extracted",
        headline: `Go ${clicksFor50} ${target && target.kind === "steps" ? "step" : "click"}${clicksFor50 === 1 ? "" : "s"} finer`,
        detail:
          "Sourness means not enough came out of the grounds. Change only the grind and brew it again — if two moves finer does nothing, then try 2°C hotter.",
        grindDelta: -clicksFor50,
      };
    case "bitter":
      return {
        verdict,
        diagnosis: "Over-extracted",
        headline: `Go ${clicksFor50} ${target && target.kind === "steps" ? "step" : "click"}${clicksFor50 === 1 ? "" : "s"} coarser`,
        detail:
          "Bitterness and dryness mean too much came out. Coarsen first; if it persists, pour more gently and skip the final stir.",
        grindDelta: clicksFor50,
      };
    case "weak":
      return {
        verdict,
        diagnosis: "Under-strength, not under-extracted",
        headline: "Tighten the ratio",
        detail:
          "If it tastes correct but watery, that is strength rather than extraction. Try 1:15 where you used 1:16 and leave the grind alone.",
      };
    case "strong":
      return {
        verdict,
        diagnosis: "Over-strength",
        headline: "Open the ratio",
        detail:
          "Add water rather than changing the grind — 1:16 where you used 1:15. Extraction is fine, there is just too much of it.",
      };
    case "good":
    default:
      return {
        verdict: "good",
        diagnosis: "Dialled in",
        headline: "Saved to your setup",
        detail: "Next time this recipe opens, it will start from the numbers that worked.",
      };
  }
}
