"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent as ReactChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type Brewer =
  | "V60"
  | "French Press"
  | "AeroPress"
  | "SIF"
  | "Origami Dripper"
  | "Kalita Wave"
  | "Cafec Deep 27"
  | "Other - Conical"
  | "Other - Flatbed"
  | "Other - Immersion";

type Grind = "Fine" | "Medium-Fine" | "Medium" | "Medium-Coarse" | "Coarse";
type Agitation = "Gentle" | "Moderate" | "Vigorous";
type Roast = "Light" | "Medium-Light" | "Medium" | "Medium-Dark" | "Dark";
type StoredRecipe = Omit<Recipe, "roast"> & {
  roast?: Roast | Roast[];
  yield?: number;
  saveCount?: number;
};

type TimelineEvent = {
  id: string;
  type: string;
  start: number;
  duration: number;
  target: string;
  tare: boolean;
  range: boolean;
  note: string;
};

type Recipe = {
  id: string;
  title: string;
  brewer: Brewer;
  dose: number;
  ratio: number;
  water: number;
  grind: Grind;
  grinder: string;
  clicks: string;
  temp: number;
  roast: Roast[];
  bean: string;
  agitation: Agitation;
  pours: number;
  stirs: number;
  swirl: boolean;
  creator: string;
  createdAt: string;
  timeline: TimelineEvent[];
};

type Draft = Omit<Recipe, "id" | "createdAt" | "creator"> & {
  creator: string;
};

const brewers: Brewer[] = [
  "V60",
  "French Press",
  "AeroPress",
  "SIF",
  "Origami Dripper",
  "Kalita Wave",
  "Cafec Deep 27",
  "Other - Conical",
  "Other - Flatbed",
  "Other - Immersion",
];

// The specific brewers the builder offers by name; anything else is typed free.
const namedBrewers: Brewer[] = brewers.filter((b) => !b.startsWith("Other"));

const roastLevels: Roast[] = ["Light", "Medium-Light", "Medium", "Medium-Dark", "Dark"];

const eventTypes = [
  "Bloom",
  "Pour",
  "Stir",
  "Swirl",
  "Wait",
  "Drawdown",
  "Plunge",
  "Press",
  "Insert plunger",
  "Custom",
];

const recipeStorageKey = "brew.recipes.v1";
const authorCookieKey = "brew_author_name";
const visitorCookieKey = "brew_seen";
const onboardedStorageKey = "bloom.onboarded.v1";

const seedRecipes: Recipe[] = [
  {
    id: "tetsu-inspired-v60",
    title: "Four Pour V60 Balance",
    brewer: "V60",
    dose: 20,
    ratio: 15,
    water: 300,
    grind: "Medium-Coarse",
    grinder: "Comandante C40",
    clicks: "25 clicks",
    temp: 92,
    roast: ["Medium-Light"],
    bean: "Washed Ethiopia, citrus and tea",
    agitation: "Moderate",
    pours: 4,
    stirs: 0,
    swirl: true,
    creator: "kurasu-lab",
    createdAt: "2026-07-12T10:00:00.000Z",
    timeline: [
      event("Bloom", 0, 45, "60", true, false, "Swirl once after wetting."),
      event("Pour", 45, 20, "120", false, false, "Center to spiral."),
      event("Pour", 90, 20, "180", false, false, "Keep slurry low."),
      event("Pour", 135, 25, "240", false, false, "Softer outer spiral."),
      event("Pour", 190, 30, "300", false, false, "Finish through center."),
      event("Drawdown", 220, 275, "", false, true, "Target finish 4:35."),
    ],
  },
  {
    id: "aeropress-bright-standard",
    title: "Bright AeroPress Standard",
    brewer: "AeroPress",
    dose: 15,
    ratio: 13.3,
    water: 200,
    grind: "Medium-Fine",
    grinder: "1Zpresso K-Ultra",
    clicks: "5.5",
    temp: 88,
    roast: ["Light"],
    bean: "Kenya peaberry, blackcurrant",
    agitation: "Gentle",
    pours: 1,
    stirs: 3,
    swirl: false,
    creator: "press-club",
    createdAt: "2026-07-15T09:30:00.000Z",
    timeline: [
      event("Pour", 0, 20, "200", true, false, "Pour quickly, cap open."),
      event("Stir", 20, 10, "", false, false, "Three gentle back-forth stirs."),
      event("Wait", 30, 60, "", false, true, "Let it steep undisturbed."),
      event("Insert plunger", 90, 10, "", false, false, "Create a light seal."),
      event("Press", 100, 35, "170", false, true, "Stop at hiss."),
    ],
  },
  {
    id: "sif-slow-morning",
    title: "Slow Morning SIF",
    brewer: "SIF",
    dose: 18,
    ratio: 8.3,
    water: 150,
    grind: "Fine",
    grinder: "Timemore C3",
    clicks: "9",
    temp: 94,
    roast: ["Medium-Dark"],
    bean: "Chicory-free filter roast",
    agitation: "Gentle",
    pours: 2,
    stirs: 0,
    swirl: false,
    creator: "filter-house",
    createdAt: "2026-07-09T07:15:00.000Z",
    timeline: [
      event("Pour", 0, 25, "60", true, false, "First saturation pour."),
      event("Wait", 25, 60, "", false, true, "Let the bed settle."),
      event("Pour", 85, 25, "150", false, false, "Top up gently."),
      event("Drawdown", 110, 530, "", false, true, "Long drip window."),
    ],
  },
];

const blankDraft: Draft = {
  title: "",
  brewer: "V60",
  dose: 18,
  ratio: 16.7,
  water: 300,
  grind: "" as Grind,
  grinder: "",
  clicks: "",
  temp: 0,
  roast: [],
  bean: "",
  agitation: "" as Agitation,
  pours: 0,
  stirs: 0,
  swirl: false,
  creator: "",
  timeline: [
    event("Bloom", 0, 30, "45", false, false, ""),
    event("Pour", 30, 30, "300", false, false, ""),
    event("Drawdown", 60, 180, "", false, true, ""),
  ],
};

function event(
  type: string,
  start: number,
  duration: number,
  target: string,
  tare: boolean,
  range: boolean,
  note: string,
): TimelineEvent {
  return {
    id: `${slugify(type)}-${start}-${duration}-${slugify(target || note)}`,
    type,
    start,
    duration,
    target,
    tare,
    range,
    note,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function ratioLabel(value: number) {
  return `1:${Number.isInteger(value) ? value : value.toFixed(1)}`;
}

function normalizeRoast(roast: Roast | Roast[] | undefined) {
  if (!roast) return [];
  return Array.isArray(roast) ? roast : [roast];
}

function roastLabel(roast: Roast | Roast[] | undefined) {
  return normalizeRoast(roast).join(" / ");
}

function defaultRecipeTitle(recipe: Pick<Recipe, "brewer" | "dose" | "ratio" | "roast">) {
  const roastText = roastLabel(recipe.roast);
  return [
    recipe.brewer,
    recipe.dose ? `${recipe.dose}g` : "",
    recipe.ratio ? ratioLabel(recipe.ratio) : "",
    roastText ? `${roastText} roast` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function recipeTitle(recipe: Pick<Recipe, "title" | "brewer" | "dose" | "ratio" | "roast">) {
  return recipe.title.trim() || defaultRecipeTitle(recipe);
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });

  if (line) lines.push(line);
  return lines;
}

const SHARE_ACCENT_FALLBACK = "#486c63";

// Draws a mobile-first, shareable "story" image (1080x1920) for a recipe.
async function renderRecipeImage(recipe: Recipe): Promise<Blob> {
  const W = 1080;
  const H = 1920;
  const P = 80;
  const inner = W - P * 2;
  const INK = "#20201e";
  const INK2 = "#6e6b66";
  const RULE = "#e5ddd2";
  const accent = brewerAccent[recipe.brewer] ?? SHARE_ACCENT_FALLBACK;
  const font = (spec: string) => `${spec} 'Hanken Grotesk', Arial, sans-serif`;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");

  ctx.fillStyle = "#f7f5f2";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 16);
  ctx.textAlign = "left";

  let y = P + 46;

  ctx.fillStyle = accent;
  ctx.font = font("700 30px");
  ctx.fillText(recipe.brewer.toUpperCase(), P, y);
  y += 62;

  ctx.fillStyle = INK;
  ctx.font = font("700 66px");
  wrapCanvasText(ctx, recipeTitle(recipe), inner)
    .slice(0, 3)
    .forEach((line) => {
      ctx.fillText(line, P, y);
      y += 74;
    });
  y += 4;

  if (recipe.bean.trim()) {
    ctx.fillStyle = INK2;
    ctx.font = font("400 34px");
    wrapCanvasText(ctx, recipe.bean, inner)
      .slice(0, 2)
      .forEach((line) => {
        ctx.fillText(line, P, y);
        y += 44;
      });
  }
  y += 34;

  const metrics: [string, string][] = [
    ["COFFEE", `${recipe.dose}g`],
    ["RATIO", ratioLabel(recipe.ratio)],
    ["WATER", `${recipe.water}g`],
  ];
  if (recipe.temp) metrics.push(["TEMP", `${recipe.temp}°C`]);
  metrics.push(["TIME", formatTime(totalTime(recipe.timeline))]);

  const stripH = 152;
  const cellW = inner / metrics.length;
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 2;
  ctx.strokeRect(P, y, inner, stripH);
  metrics.forEach(([label, value], i) => {
    const cx = P + i * cellW;
    if (i) {
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx, y + stripH);
      ctx.stroke();
    }
    ctx.fillStyle = INK2;
    ctx.font = font("700 19px");
    ctx.fillText(label, cx + 22, y + 46);
    ctx.fillStyle = INK;
    ctx.font = font("700 40px");
    ctx.fillText(value, cx + 22, y + 106);
  });
  y += stripH + 66;

  if (recipe.timeline.length) {
    ctx.fillStyle = INK;
    ctx.font = font("700 36px");
    ctx.fillText("Brew timeline", P, y);
    y += 46;

    const steps = recipe.timeline;
    const lineX = P + 18;
    const availH = H - 210 - y;
    const stepH = Math.min(196, Math.max(112, availH / Math.max(steps.length, 1)));
    const firstY = y + 42;

    ctx.strokeStyle = RULE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(lineX, firstY);
    ctx.lineTo(lineX, firstY + Math.max(0, steps.length - 1) * stepH);
    ctx.stroke();

    steps.forEach((step, i) => {
      const sy = firstY + i * stepH;
      const readout = `${eventWindowLabel(steps, i)} · ${timelineScaleLabel(steps, i)}`;
      ctx.fillStyle = isDrawdownEvent(step) ? accent : "#d89b45";
      ctx.beginPath();
      ctx.arc(lineX, sy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f7f5f2";
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = INK;
      ctx.font = font("700 34px");
      ctx.fillText(step.type, lineX + 46, sy + 2);
      ctx.fillStyle = INK2;
      ctx.font = font("600 27px");
      ctx.fillText(readout, lineX + 46, sy + 42);
      if (step.note.trim()) {
        ctx.font = font("400 26px");
        wrapCanvasText(ctx, step.note, inner - 70)
          .slice(0, 1)
          .forEach((ln) => ctx.fillText(ln, lineX + 46, sy + 80));
      }
    });
  }

  ctx.fillStyle = INK;
  ctx.font = font("700 30px");
  ctx.textAlign = "left";
  ctx.fillText("Bloom", P, H - P);
  ctx.fillStyle = INK2;
  ctx.font = font("500 23px");
  ctx.fillText("bloom.rohanmahnot.space", P, H - P + 32);
  if (recipe.creator.trim()) {
    ctx.textAlign = "right";
    ctx.font = font("600 26px");
    ctx.fillText(`by ${displayCreator(recipe.creator)}`, W - P, H - P);
  }
  ctx.textAlign = "left";

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Image export failed"))),
      "image/jpeg",
      0.95,
    );
  });
}

// Mobile: opens the native share sheet with the image (and a link back).
// Desktop / unsupported: downloads the image.
async function shareRecipeImage(recipe: Recipe, preRendered?: Blob | null) {
  // Use a pre-rendered image when available so navigator.share() runs inside
  // the click gesture (desktop drops user-activation across an await).
  const blob = preRendered ?? (await renderRecipeImage(recipe));
  const filename = `${slugify(recipeTitle(recipe)) || "brew-recipe"}.jpg`;
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/#/recipe/${recipe.id}`
      : "";
  const file = new File([blob], filename, { type: "image/jpeg" });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: recipeTitle(recipe),
        text: `${recipeTitle(recipe)} — a coffee recipe on Bloom`,
        url: link,
      });
      return;
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

type ShareStyle = "bar" | "top" | "rail" | "type";
type ShareFormat = "story" | "square";

function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
) {
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

// Draws the photo to fill the canvas. When the photo's aspect ratio is close
// to the canvas, cover-crop. When it's far off, avoid heavy cropping: draw a
// blurred, zoomed cover as the backdrop and the full photo fitted on top.
function photoDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
) {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const canvasRatio = W / H;
  const mismatch = Math.abs(Math.log(imgRatio / canvasRatio));

  if (mismatch < 0.25) {
    coverDraw(ctx, img, W, H);
    return;
  }

  // Blurred backdrop. iOS Safari ignores ctx.filter on canvas, so blur
  // manually: bounce the image through a tiny canvas and scale it back up
  // with smoothing — a cheap, everywhere-supported gaussian approximation.
  const tiny = document.createElement("canvas");
  tiny.width = Math.max(2, Math.round(W / 28));
  tiny.height = Math.max(2, Math.round(H / 28));
  const tctx = tiny.getContext("2d");
  if (tctx) {
    const tScale =
      Math.max(tiny.width / img.naturalWidth, tiny.height / img.naturalHeight) * 1.12;
    const tw = img.naturalWidth * tScale;
    const th = img.naturalHeight * tScale;
    tctx.drawImage(img, (tiny.width - tw) / 2, (tiny.height - th) / 2, tw, th);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tiny, 0, 0, W, H);
    ctx.restore();
  }
  // Slight darkening so the fitted photo pops.
  ctx.fillStyle = "rgba(20, 16, 12, 0.18)";
  ctx.fillRect(0, 0, W, H);

  // Full photo, fitted (no crop), centered.
  const fScale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
  const fw = img.naturalWidth * fScale;
  const fh = img.naturalHeight * fScale;
  ctx.drawImage(img, (W - fw) / 2, (H - fh) / 2, fw, fh);
}

// Draws a shareable image with the user's photo as the background and the
// recipe as an overlay, in one of three styles. The photo never leaves the
// device — everything happens on a local canvas.
async function renderPhotoShareImage(
  recipe: Recipe,
  photo: HTMLImageElement,
  style: ShareStyle,
  format: ShareFormat,
): Promise<Blob> {
  const W = 1080;
  const H = format === "story" ? 1920 : 1080;
  const accent = brewerAccent[recipe.brewer] ?? SHARE_ACCENT_FALLBACK;
  const font = (spec: string) => `${spec} 'Hanken Grotesk', Arial, sans-serif`;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");

  photoDraw(ctx, photo, W, H);

  const title = recipeTitle(recipe);
  const stats: [string, string][] = [];
  if (recipe.dose) stats.push(["COFFEE", `${recipe.dose}g`]);
  if (recipe.water) stats.push(["WATER", `${recipe.water}g`]);
  if (recipe.ratio) stats.push(["RATIO", ratioLabel(recipe.ratio)]);
  stats.push(["TIME", formatTime(totalTime(recipe.timeline))]);
  const statLine = stats.map(([, v]) => v).join(" · ");
  const byline = recipe.creator.trim()
    ? `${recipe.brewer} · by ${displayCreator(recipe.creator)}`
    : recipe.brewer;

  // Wordmark + link over the photo (bottom-left when the overlay sits at the top).
  const wmY = style === "top" ? H - 88 : 104;
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#ffffff";
  ctx.font = font("800 42px");
  ctx.fillText("Bloom", 56, wmY);
  ctx.font = font("600 24px");
  ctx.fillText("bloom.rohanmahnot.space", 56, wmY + 38);
  ctx.shadowBlur = 0;

  const drawStatCells = (top: number, innerH: number) => {
    const cellW = (W - 112) / stats.length;
    ctx.strokeStyle = "#e5ddd2";
    ctx.lineWidth = 2;
    stats.forEach(([label, value], i) => {
      const cx = 56 + i * cellW;
      if (i) {
        ctx.beginPath();
        ctx.moveTo(cx, top);
        ctx.lineTo(cx, top + innerH);
        ctx.stroke();
      }
      ctx.fillStyle = "#6e6b66";
      ctx.font = font("700 22px");
      ctx.fillText(label, cx + (i ? 28 : 0), top + 34);
      ctx.fillStyle = "#20201e";
      ctx.font = font("700 42px");
      ctx.fillText(value, cx + (i ? 28 : 0), top + 92);
    });
  };

  if (style === "bar") {
    const barH = 258;
    const top = H - barH;
    ctx.fillStyle = "rgba(250, 248, 244, 0.96)";
    ctx.fillRect(0, top, W, barH);
    ctx.fillStyle = accent;
    ctx.fillRect(0, top, W, 10);
    ctx.fillStyle = "#20201e";
    ctx.font = font("700 38px");
    ctx.fillText(wrapCanvasText(ctx, `${title} — ${recipe.brewer}`, W - 112)[0], 56, top + 72);
    drawStatCells(top + 104, barH - 134);
  } else if (style === "top") {
    const barH = 300;
    ctx.fillStyle = "rgba(250, 248, 244, 0.96)";
    ctx.fillRect(0, 0, W, barH);
    ctx.fillStyle = accent;
    ctx.fillRect(0, barH - 10, W, 10);
    ctx.fillStyle = "#486c63";
    ctx.font = font("800 24px");
    ctx.fillText(byline.toUpperCase(), 56, 62);
    ctx.fillStyle = "#20201e";
    ctx.font = font("700 38px");
    ctx.fillText(wrapCanvasText(ctx, title, W - 112)[0], 56, 118);
    drawStatCells(150, 116);
  } else if (style === "rail") {
    const bandH = 322;
    const top = H - bandH;
    ctx.fillStyle = "rgba(250, 248, 244, 0.96)";
    ctx.fillRect(0, top, W, bandH);
    ctx.fillStyle = accent;
    ctx.fillRect(0, top, W, 10);
    ctx.fillStyle = "#20201e";
    ctx.font = font("700 38px");
    ctx.fillText(wrapCanvasText(ctx, title, W - 112)[0], 56, top + 70);
    ctx.fillStyle = "#6e6b66";
    ctx.font = font("600 26px");
    ctx.fillText(byline, 56, top + 110);

    const steps = recipe.timeline.slice(0, 6);
    if (steps.length) {
      const total = Math.max(totalTime(recipe.timeline), 1);
      const left = 90;
      const right = W - 90;
      const lineY = top + 218;
      ctx.strokeStyle = "#d8cfc3";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(left, lineY);
      ctx.lineTo(right, lineY);
      ctx.stroke();
      ctx.textAlign = "center";
      steps.forEach((step, i) => {
        const start = eventStart(recipe.timeline, i);
        const x = left + (start / total) * (right - left);
        const isEnd = isDrawdownEvent(step) || step.range;
        ctx.fillStyle = isEnd ? "#486c63" : "#d89b45";
        ctx.beginPath();
        ctx.arc(x, lineY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#faf8f4";
        ctx.lineWidth = 5;
        ctx.stroke();
        const num = targetNumber(step.target);
        const label = step.target.trim() && num !== null ? `${num}g` : step.type.toLowerCase();
        ctx.fillStyle = "#20201e";
        ctx.font = font("800 24px");
        ctx.fillText(label, x, lineY - 32);
        ctx.fillStyle = "#6e6b66";
        ctx.font = font("600 21px");
        ctx.fillText(formatTime(start), x, lineY + 46);
      });
      ctx.textAlign = "left";
    }
  } else {
    const gradTop = H * 0.5;
    const grad = ctx.createLinearGradient(0, H, 0, gradTop);
    grad.addColorStop(0, "rgba(18, 14, 10, 0.9)");
    grad.addColorStop(0.75, "rgba(18, 14, 10, 0.45)");
    grad.addColorStop(1, "rgba(18, 14, 10, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, gradTop, W, H - gradTop);

    ctx.font = font("800 84px");
    const titleLines = wrapCanvasText(ctx, title, W - 112).slice(0, 2);
    let y = H - 96 - titleLines.length * 92;
    ctx.fillStyle = "#e9c98a";
    ctx.font = font("800 28px");
    ctx.fillText(byline.toUpperCase(), 56, y - 24);
    ctx.fillStyle = "#ffffff";
    ctx.font = font("800 84px");
    titleLines.forEach((line) => {
      ctx.fillText(line, 56, y + 74);
      y += 92;
    });
    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.font = font("600 38px");
    ctx.fillText(statLine, 56, H - 64);
  }


  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Image export failed"))),
      "image/jpeg",
      0.92,
    );
  });
}

function readNumberInput(value: string) {
  if (!value.trim()) return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function numberInputValue(value: number) {
  return value === 0 ? "" : String(value);
}

function roundedRatio(water: number, dose: number) {
  if (dose <= 0 || water <= 0) return 0;
  return Number((water / dose).toFixed(2));
}

function isDrawdownEvent(step: Pick<TimelineEvent, "type">) {
  return step.type.toLowerCase() === "drawdown";
}

function previousTimelineEnd(events: TimelineEvent[], index: number) {
  return events
    .slice(0, index)
    .reduce((end, _, stepIndex) => Math.max(end, eventEnd(events, stepIndex)), 0);
}

function eventStart(events: TimelineEvent[], index: number) {
  const step = events[index];
  if (!step) return 0;
  return isDrawdownEvent(step) ? previousTimelineEnd(events, index) : step.start;
}

function eventEnd(events: TimelineEvent[], index: number) {
  const step = events[index];
  if (!step) return 0;
  const start = eventStart(events, index);
  return isDrawdownEvent(step)
    ? Math.max(start, step.duration)
    : step.start + step.duration;
}

function eventDuration(events: TimelineEvent[], index: number) {
  return Math.max(0, eventEnd(events, index) - eventStart(events, index));
}

function totalTime(events: TimelineEvent[]) {
  return Math.max(180, ...events.map((_, index) => eventEnd(events, index)));
}

function targetNumber(target: string) {
  const match = target.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function gramLabel(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}g`;
}

function scaleLabel(step: TimelineEvent) {
  const target = step.target.trim();
  if (!target) return "no scale target";
  const normalizedTarget = /g$/i.test(target) ? target : `${target}g`;
  return `${step.tare ? "+" : ""}${normalizedTarget}`;
}

function cumulativeWeightAt(events: TimelineEvent[], index: number) {
  let cumulativeWeight: number | null = null;

  events.slice(0, index + 1).forEach((step) => {
    const target = targetNumber(step.target);
    if (target === null) return;
    cumulativeWeight =
      step.tare && cumulativeWeight !== null ? cumulativeWeight + target : target;
  });

  return cumulativeWeight;
}

function timelineScaleLabel(events: TimelineEvent[], index: number) {
  const step = events[index];
  if (step.target.trim()) return scaleLabel(step);

  const cumulativeWeight = cumulativeWeightAt(events, index);
  return cumulativeWeight === null ? "no scale target" : `${gramLabel(cumulativeWeight)} cumulative`;
}

function eventWindowLabel(events: TimelineEvent[], index: number) {
  const step = events[index];
  const start = formatTime(eventStart(events, index));
  if (!step.range && !isDrawdownEvent(step)) return start;
  return `${start}-${formatTime(eventEnd(events, index))}`;
}

function eventWaterAmount(events: TimelineEvent[], index: number) {
  const step = events[index];
  const current = targetNumber(step.target);
  if (current === null) return Math.max(12, eventDuration(events, index) / 2);
  if (step.tare) return current;

  const previous = [...events]
    .slice(0, index)
    .reverse()
    .map((eventItem) => targetNumber(eventItem.target))
    .find((value) => value !== null);

  return previous === undefined ? current : Math.max(8, current - previous);
}

function fromDraft(draft: Draft, recipes: Recipe[]): Recipe {
  const title = recipeTitle(draft);
  const creator = draft.creator.trim() || "Guest brewer";
  const base = slugify(`${creator}-${title}`) || "recipe";
  const existing = new Set(recipes.map((recipe) => recipe.id));
  let id = base;
  let suffix = 2;
  while (existing.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }

  return {
    ...draft,
    title,
    id,
    creator,
    createdAt: new Date().toISOString(),
  };
}

function readRecipes() {
  if (typeof window === "undefined") return seedRecipes;
  try {
    const stored = window.localStorage.getItem(recipeStorageKey);
    return stored
      ? migrateRecipes(JSON.parse(stored) as StoredRecipe[])
      : seedRecipes;
  } catch {
    return seedRecipes;
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${oneYear}; path=/; samesite=lax`;
}

function readAuthorName() {
  return readCookie(authorCookieKey);
}

function draftWithAuthorName() {
  return {
    ...blankDraft,
    creator: readAuthorName(),
    timeline: blankDraft.timeline.map((step) => ({ ...step })),
  };
}

function normalizeStoredRecipe(recipe: StoredRecipe) {
  const normalized = {
    ...recipe,
    roast: normalizeRoast(recipe.roast),
  };
  delete normalized.yield;
  delete normalized.saveCount;
  return normalized as Recipe;
}

function migrateRecipes(recipes: StoredRecipe[]) {
  return recipes.map(normalizeStoredRecipe);
}

function isReturningVisitor() {
  try {
    return readCookie(visitorCookieKey) === "1";
  } catch {
    return false;
  }
}

const recipesApiPath = "/api/recipes";

// Shared server storage (Cloudflare D1). Returns null on any failure so the
// caller can fall back to browser localStorage and keep working offline.
async function fetchServerRecipes(): Promise<Recipe[] | null> {
  try {
    const response = await fetch(recipesApiPath, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { recipes?: StoredRecipe[] };
    if (!body || !Array.isArray(body.recipes)) return null;
    return migrateRecipes(body.recipes);
  } catch {
    return null;
  }
}

async function saveServerRecipe(recipe: Recipe): Promise<boolean> {
  try {
    const response = await fetch(recipesApiPath, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(recipe),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default function Home() {
  const storageReady = useRef(false);
  const [recipes, setRecipes] = useState<Recipe[]>(seedRecipes);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [view, setView] = useState("home");
  const [activeId, setActiveId] = useState(seedRecipes[0].id);
  const [search, setSearch] = useState("");
  const [brewerFilter, setBrewerFilter] = useState("All brewers");
  const [publishMessage, setPublishMessage] = useState("");
  const [justPublishedId, setJustPublishedId] = useState("");
  const [shareId, setShareId] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  function dismissOnboarding() {
    try {
      window.localStorage.setItem(onboardedStorageKey, "1");
    } catch {
      // ignore
    }
    setShowOnboarding(false);
  }

  useEffect(() => {
    const hydrateStorage = window.setTimeout(() => {
      const cached = readRecipes();
      setRecipes(cached);
      storageReady.current = true;
      writeCookie(visitorCookieKey, "1");

      // Reconcile with shared server storage (D1). The server is the single
      // source of truth: on load we replace the local view with whatever the
      // server has. We do NOT auto-upload device-only recipes here — publishing
      // is what pushes a recipe up — so deletions on the server actually stick
      // instead of being resurrected from a stale local cache. If the server is
      // unreachable or empty, we silently keep the localStorage / seed view.
      void (async () => {
        const server = await fetchServerRecipes();
        if (!server || !server.length) return;
        setRecipes(server);
        try {
          window.localStorage.setItem(recipeStorageKey, JSON.stringify(server));
        } catch {
          // ignore cache write failures
        }
      })();

      if (window.location.hash.replace("#/", "").split("/")[0] === "builder") {
        setDraft((currentDraft) => ({
          ...currentDraft,
          creator: currentDraft.creator || readAuthorName(),
        }));
      }

      // First-visit onboarding: once per browser, and never when someone
      // arrives on a shared deep link (recipe/builder/etc).
      try {
        const isDeepLink = Boolean(window.location.hash.replace("#/", ""));
        if (!isDeepLink && !window.localStorage.getItem(onboardedStorageKey)) {
          setShowOnboarding(true);
        }
      } catch {
        // storage unavailable — skip onboarding quietly
      }
    }, 0);

    const syncRoute = () => {
      const [route, id] = window.location.hash.replace("#/", "").split("/");
      setView(route || "home");
      if (id) setActiveId(id);
    };
    syncRoute();
    window.addEventListener("hashchange", syncRoute);
    return () => {
      window.clearTimeout(hydrateStorage);
      window.removeEventListener("hashchange", syncRoute);
    };
  }, []);

  useEffect(() => {
    if (storageReady.current && recipes.length) {
      window.localStorage.setItem(recipeStorageKey, JSON.stringify(recipes));
    }
  }, [recipes]);

  const activeRecipe =
    recipes.find((recipe) => recipe.id === activeId) ?? recipes[0] ?? seedRecipes[0];

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return recipes
      .filter((recipe) => {
        const matchesSearch =
          !normalizedSearch ||
          recipe.title.toLowerCase().includes(normalizedSearch) ||
          recipe.creator.toLowerCase().includes(normalizedSearch) ||
          recipe.bean.toLowerCase().includes(normalizedSearch);
        const matchesBrewer =
          brewerFilter === "All brewers" || recipe.brewer === brewerFilter;
        return matchesSearch && matchesBrewer;
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [recipes, search, brewerFilter]);

  function go(nextView: string, id?: string) {
    window.location.hash = id ? `#/${nextView}/${id}` : `#/${nextView}`;
    setView(nextView);
    if (id) setActiveId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startNewRecipe() {
    setDraft(draftWithAuthorName());
    setPublishMessage("");
    go("builder");
  }

  function publishRecipe() {
    const recipe = fromDraft(draft, recipes);
    if (draft.creator.trim()) {
      writeCookie(authorCookieKey, draft.creator.trim());
    }
    setRecipes((items) => [recipe, ...items]);
    void saveServerRecipe(recipe);
    setPublishMessage(`Published as /${recipe.creator}/${recipe.id}.`);
    setJustPublishedId(recipe.id);
    go("recipe", recipe.id);
  }

  return (
    <main className="min-h-screen bg-[var(--oat)] text-[var(--ink)]">
      <Header
        onCreate={startNewRecipe}
        onHome={() => go("home")}
        onAbout={() => go("about")}
      />
      {view === "about" ? (
        <AboutPage onCreate={startNewRecipe} onBrowse={() => go("home")} />
      ) : view === "builder" ? (
        <Builder
          draft={draft}
          onDraft={setDraft}
          onPublish={publishRecipe}
          publishMessage={publishMessage}
        />
      ) : view === "recipe" ? (
        <RecipePage
          recipe={activeRecipe}
          onShare={() => setShareId(activeRecipe.id)}
          sharePrompt={justPublishedId === activeRecipe.id}
          onDismissPrompt={() => setJustPublishedId("")}
        />
      ) : view === "creator" ? (
        <CreatorProfile
          username={activeId}
          recipes={recipes.filter((recipe) => recipe.creator === activeId)}
          onOpen={(id) => go("recipe", id)}
          onCreate={startNewRecipe}
        />
      ) : (
        <Library
          recipes={filteredRecipes}
          search={search}
          brewerFilter={brewerFilter}
          onSearch={setSearch}
          onBrewerFilter={setBrewerFilter}
          onOpen={(id) => go("recipe", id)}
          onCreate={startNewRecipe}
          onShare={(id) => setShareId(id)}
        />
      )}
      {shareId ? (
        <ShareSheet
          recipe={recipes.find((r) => r.id === shareId) ?? activeRecipe}
          onClose={() => setShareId("")}
        />
      ) : null}
      {showOnboarding ? <OnboardingOverlay onDone={dismissOnboarding} /> : null}
    </main>
  );
}

const onboardingSlides = [
  {
    icon: "☕",
    title: "A shared library of brews",
    body: "Browse recipes from world champions, your favourite creators — and people like you.",
  },
  {
    icon: "✍️",
    title: "Write it how you'd say it",
    body: "Just coffee, water, and your pours — “at 0:40, pour to 150g.” Everything else is optional.",
  },
  {
    icon: "📸",
    title: "Share your brew",
    body: "Turn any recipe into a beautiful story card — add a photo of your cup if you like.",
  },
];

function OnboardingOverlay({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0);
  const current = onboardingSlides[slide];
  const isLast = slide === onboardingSlides.length - 1;

  return (
    <div className="ob-backdrop" onClick={onDone}>
      <div
        className="ob-card"
        role="dialog"
        aria-label="Welcome to Bloom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ob-icon" aria-hidden>{current.icon}</div>
        <h3>{current.title}</h3>
        <p>{current.body}</p>
        <div className="ob-dots" aria-hidden>
          {onboardingSlides.map((_, i) => (
            <span key={i} className={i === slide ? "ob-dot on" : "ob-dot"} />
          ))}
        </div>
        <button
          className="primary-button ob-next"
          onClick={() => (isLast ? onDone() : setSlide(slide + 1))}
        >
          {isLast ? "Start brewing" : "Next"}
        </button>
        <button className="ob-skip" onClick={onDone}>
          Skip
        </button>
      </div>
    </div>
  );
}

function Header({
  onCreate,
  onHome,
  onAbout,
}: {
  onCreate: () => void;
  onHome: () => void;
  onAbout: () => void;
}) {
  return (
    <header className="site-masthead">
      <div className="masthead-inner">
        <button className="brand-lockup" onClick={onHome}>
          <strong>Bloom</strong>
        </button>
        <nav className="site-nav" aria-label="Primary navigation">
          <button className="ghost-button" onClick={onAbout}>How to use</button>
          <button className="primary-button" onClick={onCreate}>Write recipe</button>
        </nav>
      </div>
    </header>
  );
}

function AboutPage({ onCreate, onBrowse }: { onCreate: () => void; onBrowse: () => void }) {
  return (
    <section className="about-page mx-auto px-5 sm:px-8">
      <p className="eyebrow">How to use</p>
      <h1 className="about-title">A simple place to log and share coffee recipes.</h1>
      <p className="about-lead">
        Bloom is a shared library for pour-over, immersion, and AeroPress recipes — from your own
        morning cup to the routines that won world championships. No account, no clutter: write it
        the way you&rsquo;d say it, and it shows up for everyone.
      </p>

      <div className="about-block">
        <h2>Reading a recipe</h2>
        <p>
          Every card leads with the essentials — brewer, ratio, and the coffee / water / time at a
          glance. A colored edge and small icon tell you the brew method instantly (a V60 cone, a
          French press, an AeroPress, and so on). Open a recipe to see the full pour timeline laid
          out step by step.
        </p>
      </div>

      <div className="about-block">
        <h2>Writing your own</h2>
        <p>
          Tap <strong>Write recipe</strong> and you only need four things: a title, the brewer, and
          how much coffee and water you use. Everything else is optional — tap the little
          &ldquo;+&rdquo; chips to add temperature, grind, roast, or anything you care about, and
          leave the rest off.
        </p>
        <p>
          Pour steps are optional too. Each one reads like a sentence: <em>&ldquo;at 0:40, pour to
          150 g.&rdquo;</em> Pick <em>Drawdown</em> or <em>Wait</em> for a pause, add a note if you
          like, and skip the timeline entirely if you just want to jot the basics.
        </p>
      </div>

      <div className="about-block">
        <h2>It syncs everywhere</h2>
        <p>
          Publish once and your recipe is saved to the shared library, so it appears on every device
          and for anyone who visits — no sign-in required.
        </p>
      </div>

      <div className="about-cta">
        <button className="primary-button" onClick={onCreate}>Write a recipe</button>
        <button className="secondary-button" onClick={onBrowse}>Browse the library</button>
      </div>
    </section>
  );
}

function Library({
  recipes,
  search,
  brewerFilter,
  onSearch,
  onBrewerFilter,
  onOpen,
  onCreate,
  onShare,
}: {
  recipes: Recipe[];
  search: string;
  brewerFilter: string;
  onSearch: (value: string) => void;
  onBrewerFilter: (value: string) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onShare: (id: string) => void;
}) {
  return (
    <>
      <section className="bloom-hero">
        <div>
          <p className="eyebrow">Brew recipe library</p>
          <h1 className="bloom-hero-title">
            Brew, log, and share your favorite coffee recipes.
          </h1>
        </div>
        <button className="primary-button" onClick={onCreate}>
          Write recipe
        </button>
      </section>

      <section id="library" className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <div className="section-heading">
          <div>
            <h2>Library</h2>
          </div>
          <p>{recipes.length} recipes</p>
        </div>

        <div className="filter-bar">
          <label>
            Search
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Title, creator, or coffee"
            />
          </label>
          <label>
            Brewer
            <select
              value={brewerFilter}
              onChange={(event) => onBrewerFilter(event.target.value)}
            >
              <option>All brewers</option>
              {brewers.map((brewer) => (
                <option key={brewer}>{brewer}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onOpen={() => onOpen(recipe.id)}
              onShare={() => onShare(recipe.id)}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function FeaturedSheet({ recipe }: { recipe: Recipe }) {
  return (
    <div className="featured-sheet">
      <RecipeHeader recipe={recipe} compact />
      <Timeline recipe={recipe} />
    </div>
  );
}

// One accent color per brewer, used for the card's left edge and brewer label.
const brewerAccent: Record<string, string> = {
  "V60": "#c65f3f",
  "French Press": "#7a5230",
  "AeroPress": "#5f7d8c",
  "SIF": "#6f8a5b",
  "Origami Dripper": "#c07aa0",
  "Kalita Wave": "#c99a3c",
  "Cafec Deep 27": "#4f8a7b",
  "Other - Conical": "#8a7bb0",
  "Other - Flatbed": "#9a8a4a",
  "Other - Immersion": "#8a6f5a",
};

function accentForBrewer(brewer: string) {
  return brewerAccent[brewer] ?? "var(--teal)";
}

function displayCreator(creator: string) {
  return creator.trim().replace(/^by\s+/i, "");
}

function BrewerIcon({ brewer }: { brewer: string }) {
  const common = {
    className: "brewer-icon",
    width: 26,
    height: 26,
    fill: "none",
    stroke: "currentColor",
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    "aria-hidden": true,
  };

  switch (brewer) {
    case "V60":
      return (
        <svg {...common} viewBox="0 0 24 24" strokeWidth={1.7}>
          <path d="M6 8h12l-6 10z" />
        </svg>
      );
    case "Cafec Deep 27":
      return (
        <svg {...common} viewBox="0 0 24 24" strokeWidth={1.7}>
          <path d="M7 7h10l-5 13z" />
        </svg>
      );
    case "Origami Dripper":
      return (
        <svg {...common} viewBox="0 0 32 32" strokeWidth={1.5}>
          <path d="M5 9l3 2 3-2 3 2 3-2 3 2 3-2 3 2" />
          <path d="M5 9l8 13h6l8-13" />
          <path d="M11 11l3 11M21 11l-3 11M16 11v11" />
        </svg>
      );
    case "Kalita Wave":
      return (
        <svg {...common} viewBox="0 0 32 32" strokeWidth={1.6}>
          <path d="M6 10h20l-3.5 11h-13z" />
          <path d="M11.5 21q1.3 1.4 2.6 0t2.6 0 2.6 0" />
        </svg>
      );
    case "French Press":
      return (
        <svg {...common} viewBox="0 0 32 32" strokeWidth={1.6}>
          <rect x="9" y="10" width="12" height="16" rx="2" />
          <path d="M8 9.5h14" />
          <path d="M15 9.5V4" />
          <circle cx="15" cy="3.4" r="1.5" />
          <path d="M9 6.5l-2-1v3" />
          <path d="M21 14q4 0 4 4t-4 4" />
        </svg>
      );
    case "AeroPress":
      return (
        <svg {...common} viewBox="0 0 32 32" strokeWidth={1.5}>
          <rect x="9.5" y="4" width="13" height="2.6" rx="1.2" />
          <rect x="12" y="6.6" width="8" height="6.4" rx="0.8" />
          <path d="M10.5 13h11v8.5l-1 2.6h-9l-1-2.6z" />
          <path d="M10.5 13q5.5-1.6 11 0" />
        </svg>
      );
    case "SIF":
      return (
        <svg {...common} viewBox="0 0 32 32" strokeWidth={1.6}>
          <path d="M11 16h10v8a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2z" />
          <rect x="11" y="10" width="10" height="6" />
          <path d="M11 10q5-4 10 0" />
          <path d="M16 7V5" />
          <circle cx="16" cy="4" r="1.1" />
        </svg>
      );
    default:
      // Other - Conical / Flatbed / Immersion, and any unknown brewer.
      return (
        <svg {...common} viewBox="0 0 32 32" strokeWidth={1.6}>
          <path d="M9 10h11v10a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z" />
          <path d="M20 12q4 0 4 3.5t-4 3.5" />
        </svg>
      );
  }
}

function RecipeCard({
  recipe,
  onOpen,
  onShare,
}: {
  recipe: Recipe;
  onOpen: () => void;
  onShare?: () => void;
}) {
  function handleCardKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  const author = displayCreator(recipe.creator);
  const accent = accentForBrewer(recipe.brewer);

  return (
    <article
      className="recipe-card"
      style={{ ["--accent" as string]: accent } as CSSProperties}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleCardKeyDown}
    >
      <BrewerIcon brewer={recipe.brewer} />
      <div className="rc-body">
        <div className="card-meta">
          <span>{recipe.brewer}</span>
          {recipe.ratio ? <span>{ratioLabel(recipe.ratio)}</span> : null}
        </div>
        <h3>{recipeTitle(recipe)}</h3>
        {recipe.bean.trim() ? <p className="rc-bean">{recipe.bean}</p> : null}
      </div>
      <div className="recipe-stats">
        <div>
          <span>Dose</span>
          <strong>{recipe.dose ? `${recipe.dose}g` : "—"}</strong>
        </div>
        <div>
          <span>Water</span>
          <strong>{recipe.water ? `${recipe.water}g` : "—"}</strong>
        </div>
        <div>
          <span>Time</span>
          <strong>{formatTime(totalTime(recipe.timeline))}</strong>
        </div>
      </div>
      <div className="rc-foot">
        {author ? <p className="creator-line">by {author}</p> : <span />}
        {onShare ? (
          <button
            className="card-share"
            aria-label={`Share ${recipeTitle(recipe)}`}
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
          >
            ↗
          </button>
        ) : null}
      </div>
    </article>
  );
}

function CreatorProfile({
  username,
  recipes,
  onOpen,
  onCreate,
}: {
  username: string;
  recipes: Recipe[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="profile-band">
        <p className="eyebrow">Creator profile</p>
        <h1>{username}</h1>
        <div className="recipe-stats">
          <span>{recipes.length} recipes</span>
          <span>{new Set(recipes.map((recipe) => recipe.brewer)).size} brewers</span>
        </div>
        <button className="primary-button" onClick={onCreate}>
          Write recipe
        </button>
      </div>

      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onOpen={() => onOpen(recipe.id)}
          />
        ))}
      </div>
    </section>
  );
}

const detailKeys = [
  "temp",
  "grind",
  "roast",
  "agitation",
  "grinder",
  "pours",
  "stirs",
  "swirl",
] as const;
type DetailKey = (typeof detailKeys)[number];

const detailLabels: Record<DetailKey, string> = {
  temp: "Temp",
  grind: "Grind",
  roast: "Roast",
  agitation: "Agitation",
  grinder: "Grinder",
  pours: "Pours",
  stirs: "Stirs",
  swirl: "Swirl",
};

function activeDetailKeys(d: Draft): DetailKey[] {
  const a: DetailKey[] = [];
  if (d.temp > 0) a.push("temp");
  if (d.grind) a.push("grind");
  if (normalizeRoast(d.roast).length) a.push("roast");
  if (d.agitation) a.push("agitation");
  if (d.grinder.trim()) a.push("grinder");
  if (d.pours > 0) a.push("pours");
  if (d.stirs > 0) a.push("stirs");
  if (d.swirl) a.push("swirl");
  return a;
}

function parseTimeInput(value: string): number {
  const v = value.trim();
  if (v.includes(":")) {
    const [m, s] = v.split(":");
    return (parseInt(m || "0", 10) || 0) * 60 + (parseInt(s || "0", 10) || 0);
  }
  return parseInt(v || "0", 10) || 0;
}

function DetailField({
  label,
  onRemove,
  children,
}: {
  label: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="detail-field">
      <span className="detail-field-label">{label}</span>
      <div className="detail-field-input">{children}</div>
      <button className="detail-remove" onClick={onRemove} aria-label={`Remove ${label}`}>
        ✕
      </button>
    </div>
  );
}

function Builder({
  draft,
  onDraft,
  onPublish,
  publishMessage,
}: {
  draft: Draft;
  onDraft: (draft: Draft) => void;
  onPublish: () => void;
  publishMessage: string;
}) {
  const [openDetails, setOpenDetails] = useState<DetailKey[]>(() => activeDetailKeys(draft));

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    onDraft({ ...draft, [key]: value });
  }

  function setNumberField(key: "temp" | "pours" | "stirs", value: string) {
    onDraft({ ...draft, [key]: readNumberInput(value) });
  }

  function updateDose(value: string) {
    const nextDose = readNumberInput(value);
    onDraft({
      ...draft,
      dose: nextDose,
      ratio: nextDose > 0 && draft.water > 0 ? roundedRatio(draft.water, nextDose) : draft.ratio,
    });
  }

  function updateWater(value: string) {
    const nextWater = readNumberInput(value);
    onDraft({
      ...draft,
      water: nextWater,
      ratio: draft.dose > 0 && nextWater > 0 ? roundedRatio(nextWater, draft.dose) : draft.ratio,
    });
  }

  const detailDefaults: Record<DetailKey, Partial<Draft>> = {
    temp: { temp: 93 },
    grind: { grind: "Medium" as Grind },
    roast: { roast: [] },
    agitation: { agitation: "Moderate" as Agitation },
    grinder: { grinder: "" },
    pours: { pours: 3 },
    stirs: { stirs: 1 },
    swirl: { swirl: true },
  };

  const detailReset: Record<DetailKey, Partial<Draft>> = {
    temp: { temp: 0 },
    grind: { grind: "" as Grind },
    roast: { roast: [] },
    agitation: { agitation: "" as Agitation },
    grinder: { grinder: "" },
    pours: { pours: 0 },
    stirs: { stirs: 0 },
    swirl: { swirl: false },
  };

  function addDetail(key: DetailKey) {
    if (openDetails.includes(key)) return;
    setOpenDetails([...openDetails, key]);
    onDraft({ ...draft, ...detailDefaults[key] });
  }

  function removeDetail(key: DetailKey) {
    setOpenDetails(openDetails.filter((k) => k !== key));
    onDraft({ ...draft, ...detailReset[key] });
  }

  function updateEvent(index: number, patch: Partial<TimelineEvent>) {
    onDraft({
      ...draft,
      timeline: draft.timeline.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...patch } : step,
      ),
    });
  }

  function updateEventType(index: number, type: string) {
    const step = draft.timeline[index];
    const previousEnd = previousTimelineEnd(draft.timeline, index);
    // "range" (a time window) is implied by the step type, not a user toggle.
    const isRange = type === "Drawdown" || type === "Wait";
    const patch: Partial<TimelineEvent> = { type, range: isRange };

    if (type === "Drawdown") {
      patch.start = previousEnd;
      patch.duration = Math.max(step.duration, previousEnd + 60);
    }

    updateEvent(index, patch);
  }

  function addEvent() {
    const start = Math.max(0, totalTime(draft.timeline) - 120);
    onDraft({
      ...draft,
      timeline: [
        ...draft.timeline,
        {
          ...event("Pour", start, 20, String(draft.water), false, false, ""),
          id: crypto.randomUUID(),
        },
      ],
    });
  }

  function removeEvent(index: number) {
    onDraft({
      ...draft,
      timeline: draft.timeline.filter((_, stepIndex) => stepIndex !== index),
    });
  }

  return (
    <section className="builder-page mx-auto px-5 sm:px-8">
      <div className="builder-head">
        <div>
          <p className="eyebrow">Write a recipe</p>
          <h2>Your recipe</h2>
        </div>
        <button className="primary-button" onClick={onPublish}>
          Publish
        </button>
      </div>

      {publishMessage ? <p className="notice">{publishMessage}</p> : null}

      <label className="field-full">
        Title
        <input
          value={draft.title}
          onChange={(e) => setField("title", e.target.value)}
          placeholder={defaultRecipeTitle(draft) || "Name your recipe"}
        />
      </label>

      <div className="essentials">
        <label>
          Brewer
          <select
            value={namedBrewers.includes(draft.brewer) ? draft.brewer : "Other"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "Other") {
                if (namedBrewers.includes(draft.brewer)) setField("brewer", "" as Brewer);
              } else {
                setField("brewer", v as Brewer);
              }
            }}
          >
            {namedBrewers.map((b) => (
              <option key={b}>{b}</option>
            ))}
            <option value="Other">Other…</option>
          </select>
          {!namedBrewers.includes(draft.brewer) ? (
            <input
              className="brewer-custom"
              value={draft.brewer}
              placeholder="Name your brewer — e.g. Orea, SOLO, Chemex"
              onChange={(e) => setField("brewer", e.target.value as Brewer)}
            />
          ) : null}
        </label>
        <label>
          Coffee (g)
          <input
            type="number"
            value={numberInputValue(draft.dose)}
            placeholder="0"
            onChange={(e) => updateDose(e.target.value)}
          />
        </label>
        <label>
          Water (g)
          <input
            type="number"
            value={numberInputValue(draft.water)}
            placeholder="0"
            onChange={(e) => updateWater(e.target.value)}
          />
        </label>
      </div>
      {draft.dose > 0 && draft.water > 0 ? (
        <p className="ratio-hint">Ratio {ratioLabel(roundedRatio(draft.water, draft.dose))}</p>
      ) : null}

      <div className="details-block">
        <p className="field-label">
          Details <span className="opt">- optional, add what you like</span>
        </p>
        {openDetails.length ? (
          <div className="detail-fields">
            {openDetails.includes("temp") ? (
              <DetailField label="Temp (C)" onRemove={() => removeDetail("temp")}>
                <input
                  type="number"
                  value={numberInputValue(draft.temp)}
                  placeholder="0"
                  onChange={(e) => setNumberField("temp", e.target.value)}
                />
              </DetailField>
            ) : null}
            {openDetails.includes("grind") ? (
              <DetailField label="Grind" onRemove={() => removeDetail("grind")}>
                <select value={draft.grind} onChange={(e) => setField("grind", e.target.value as Grind)}>
                  <option value="">Select</option>
                  {["Fine", "Medium-Fine", "Medium", "Medium-Coarse", "Coarse"].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </DetailField>
            ) : null}
            {openDetails.includes("roast") ? (
              <DetailField label="Roast" onRemove={() => removeDetail("roast")}>
                <select
                  value={draft.roast[0] ?? ""}
                  onChange={(e) => setField("roast", e.target.value ? [e.target.value as Roast] : [])}
                >
                  <option value="">Select</option>
                  {roastLevels.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </DetailField>
            ) : null}
            {openDetails.includes("agitation") ? (
              <DetailField label="Agitation" onRemove={() => removeDetail("agitation")}>
                <select value={draft.agitation} onChange={(e) => setField("agitation", e.target.value as Agitation)}>
                  <option value="">Select</option>
                  {["Gentle", "Moderate", "Vigorous"].map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </DetailField>
            ) : null}
            {openDetails.includes("grinder") ? (
              <DetailField label="Grinder & setting" onRemove={() => removeDetail("grinder")}>
                <input
                  value={draft.grinder}
                  placeholder="e.g. Comandante - 25"
                  onChange={(e) => setField("grinder", e.target.value)}
                />
              </DetailField>
            ) : null}
            {openDetails.includes("pours") ? (
              <DetailField label="Pours" onRemove={() => removeDetail("pours")}>
                <input
                  type="number"
                  value={numberInputValue(draft.pours)}
                  placeholder="0"
                  onChange={(e) => setNumberField("pours", e.target.value)}
                />
              </DetailField>
            ) : null}
            {openDetails.includes("stirs") ? (
              <DetailField label="Stirs" onRemove={() => removeDetail("stirs")}>
                <input
                  type="number"
                  value={numberInputValue(draft.stirs)}
                  placeholder="0"
                  onChange={(e) => setNumberField("stirs", e.target.value)}
                />
              </DetailField>
            ) : null}
            {openDetails.includes("swirl") ? (
              <DetailField label="Swirl" onRemove={() => removeDetail("swirl")}>
                <label className="swirl-toggle">
                  <input type="checkbox" checked={draft.swirl} onChange={(e) => setField("swirl", e.target.checked)} />
                  Swirl the brewer
                </label>
              </DetailField>
            ) : null}
          </div>
        ) : null}
        <div className="detail-chips">
          {detailKeys
            .filter((k) => !openDetails.includes(k))
            .map((k) => (
              <button key={k} className="detail-add" onClick={() => addDetail(k)}>
                + {detailLabels[k]}
              </button>
            ))}
        </div>
      </div>

      <div className="steps-block">
        <div className="steps-head">
          <p className="field-label" style={{ margin: 0 }}>
            Pour steps <span className="opt">- optional</span>
          </p>
          <button className="secondary-button" onClick={addEvent}>
            + Add step
          </button>
        </div>
        {draft.timeline.length === 0 ? (
          <div className="steps-empty">No steps yet - add pour steps for a timeline, or skip it.</div>
        ) : (
          draft.timeline.map((step, index) => {
            const isDrawdown = isDrawdownEvent(step);
            return (
              <div className="step-row" key={step.id}>
                <select className="step-type" value={step.type} onChange={(e) => updateEventType(index, e.target.value)}>
                  {eventTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                {isDrawdown ? (
                  <span className="step-say">
                    finishes ~
                    <input
                      className="step-time"
                      value={formatTime(step.duration)}
                      onChange={(e) => updateEvent(index, { duration: parseTimeInput(e.target.value) })}
                    />
                  </span>
                ) : (
                  <span className="step-say">
                    at
                    <input
                      className="step-time"
                      value={formatTime(step.start)}
                      onChange={(e) => updateEvent(index, { start: parseTimeInput(e.target.value) })}
                    />
                    &rarr; pour to
                    <input
                      className="step-target"
                      value={step.target}
                      placeholder="g"
                      onChange={(e) => updateEvent(index, { target: e.target.value })}
                    />
                    g
                  </span>
                )}
                <input
                  className="step-note"
                  value={step.note}
                  placeholder="note (optional)"
                  onChange={(e) => updateEvent(index, { note: e.target.value })}
                />
                <button
                  className="step-remove"
                  onClick={() => removeEvent(index)}
                  aria-label="Remove step"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="essentials notes-row">
        <label className="notes-cell">
          Notes
          <input
            value={draft.bean}
            placeholder="Tasting notes, technique, verdict..."
            onChange={(e) => setField("bean", e.target.value)}
          />
        </label>
        <label>
          Your name
          <input value={draft.creator} placeholder="Author" onChange={(e) => setField("creator", e.target.value)} />
        </label>
      </div>
    </section>
  );
}

function RecipePage({
  recipe,
  onShare,
  sharePrompt = false,
  onDismissPrompt,
}: {
  recipe: Recipe;
  onShare: () => void;
  sharePrompt?: boolean;
  onDismissPrompt?: () => void;
}) {
  const [isSharing, setIsSharing] = useState(false);
  const quickBlobRef = useRef<Blob | null>(null);

  // Pre-render the default share card the moment the page loads, so tapping
  // Share opens the native sheet instantly (and inside the tap gesture).
  useEffect(() => {
    let alive = true;
    quickBlobRef.current = null;
    renderRecipeImage(recipe)
      .then((blob) => {
        if (alive) quickBlobRef.current = blob;
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [recipe]);

  async function quickShare() {
    setIsSharing(true);
    try {
      await shareRecipeImage(recipe, quickBlobRef.current);
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <section className="recipe-page print-page">
      {sharePrompt ? (
        <div className="publish-banner">
          <div>
            <strong>Published!</strong>
            <span> Your recipe is live in the library.</span>
          </div>
          <div className="publish-banner-actions">
            <button className="primary-button" onClick={onShare}>
              Share your brew
            </button>
            <button className="ghost-button" onClick={onDismissPrompt}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <div className="recipe-actions">
        <div>
          <p className="eyebrow share-path">/{slugify(recipe.creator) || "guest"}/{recipe.id}</p>
        </div>
        <div className="action-group">
          <button className="primary-button" disabled={isSharing} onClick={quickShare}>
            {isSharing ? "Sharing…" : "↗ Share"}
          </button>
        </div>
      </div>
      <div className="public-recipe">
        <RecipeHeader recipe={recipe} />
        <Timeline recipe={recipe} />
      </div>
      <button className="customize-link" onClick={onShare}>
        Customize with a photo →
      </button>
    </section>
  );
}

const shareStyles: { key: ShareStyle; label: string }[] = [
  { key: "bar", label: "Stat bar" },
  { key: "top", label: "Top bar" },
  { key: "rail", label: "Timeline" },
  { key: "type", label: "Big type" },
];

function ShareSheet({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [style, setStyle] = useState<ShareStyle>("bar");
  const [format, setFormat] = useState<ShareFormat>("story");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSharing, setIsSharing] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  // Re-render the share image whenever anything changes. The blob is kept
  // ready so Share can call navigator.share() inside the tap gesture.
  useEffect(() => {
    let alive = true;
    const render = photo
      ? renderPhotoShareImage(recipe, photo, style, format)
      : renderRecipeImage(recipe);
    render
      .then((blob) => {
        if (!alive) return;
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [recipe, photo, style, format]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onPickPhoto(e: ReactChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setPhoto(img);
    img.src = url;
    e.target.value = "";
  }

  async function handleShare() {
    setIsSharing(true);
    try {
      await shareRecipeImage(recipe, blobRef.current);
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="share-sheet"
        role="dialog"
        aria-label="Share this recipe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <span className="sheet-title">Share your brew</span>
          <button className="sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={format === "square" && photo ? "sheet-preview square" : "sheet-preview"}>
          {previewUrl ? (
            <img src={previewUrl} alt="Share preview" />
          ) : (
            <div className="composer-loading">Preparing…</div>
          )}
          {!photo ? (
            <label className="preview-add">
              <span className="preview-add-ic">＋</span>
              <span>Add your photo</span>
              <input type="file" accept="image/*" onChange={onPickPhoto} hidden />
            </label>
          ) : (
            <div className="preview-actions">
              <label className="preview-chip">
                ↻ Change
                <input type="file" accept="image/*" onChange={onPickPhoto} hidden />
              </label>
              <button
                className="preview-chip round"
                aria-label="Remove photo"
                onClick={() => setPhoto(null)}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {photo ? (
          <>
            <p className="control-label">Style</p>
            <div className="style-seg">
              {shareStyles.map(({ key, label }) => (
                <button
                  key={key}
                  className={style === key ? "style-opt on" : "style-opt"}
                  onClick={() => setStyle(key)}
                >
                  <span className={`style-thumb t-${key}`} aria-hidden />
                  <small>{label}</small>
                </button>
              ))}
            </div>
            <div className="format-row">
              <p className="control-label" style={{ margin: 0 }}>Format</p>
              <div className="format-toggle">
                <button
                  className={format === "story" ? "format-opt on" : "format-opt"}
                  onClick={() => setFormat("story")}
                >
                  <span className="f-rect" aria-hidden />
                  Story
                </button>
                <button
                  className={format === "square" ? "format-opt on" : "format-opt"}
                  onClick={() => setFormat("square")}
                >
                  <span className="f-rect sq" aria-hidden />
                  Square
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="composer-hint">Tap the preview to add a photo of your brew — or share the clean card as is.</p>
        )}

        <button className="primary-button sheet-share" disabled={isSharing} onClick={handleShare}>
          {isSharing ? "Preparing…" : "Share"}
        </button>
        <p className="composer-privacy">Your photo stays on your device — never uploaded.</p>
      </div>
    </div>
  );
}

function RecipeHeader({ recipe, compact = false }: { recipe: Recipe; compact?: boolean }) {
  const grindItems = [
    roastLabel(recipe.roast) ? `${roastLabel(recipe.roast)} roast` : "",
    recipe.grind,
    recipe.grinder.trim(),
    recipe.clicks.trim(),
    recipe.agitation ? `${recipe.agitation} agitation` : "",
  ].filter(Boolean);

  return (
    <section className={compact ? "recipe-header compact" : "recipe-header"}>
      <div>
        <p className="eyebrow">{recipe.brewer}</p>
        <h2>{recipeTitle(recipe)}</h2>
        {recipe.bean.trim() ? <p className="bean-line">{recipe.bean}</p> : null}
      </div>
      <div className="header-metrics">
        <Metric label="Brewer" value={recipe.brewer} small />
        {recipe.dose ? <Metric label="Dose" value={`${recipe.dose}g`} /> : null}
        {recipe.ratio ? <Metric label="Ratio" value={ratioLabel(recipe.ratio)} /> : null}
        {recipe.water ? <Metric label="Water" value={`${recipe.water}g`} /> : null}
        {recipe.temp ? <Metric label="Temp" value={`${recipe.temp}°C`} /> : null}
        <Metric label="Time" value={formatTime(totalTime(recipe.timeline))} />
      </div>
      {grindItems.length ? (
        <div className="grind-strip">
          {grindItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className={small ? "metric-small" : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Timeline({ recipe }: { recipe: Recipe }) {
  const shellRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const length = totalTime(recipe.timeline);
  const trackWidth = Math.max(760, length * 2.7);
  const baseline = 118;
  const trackHeight = 370;
  const markers = Array.from({ length: Math.floor(length / 15) + 1 }, (_, index) => index * 15);

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    const shell = shellRef.current;
    if (!shell || event.button !== 0 || shell.scrollWidth <= shell.clientWidth) return;
    dragRef.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: shell.scrollLeft,
    };
    shell.classList.add("is-dragging");
    shell.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const shell = shellRef.current;
    if (!shell || !dragRef.current.active) return;
    event.preventDefault();
    const delta = event.clientX - dragRef.current.startX;
    shell.scrollLeft = dragRef.current.scrollLeft - delta;
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const shell = shellRef.current;
    if (!shell) return;
    dragRef.current.active = false;
    shell.classList.remove("is-dragging");
    if (shell.hasPointerCapture(event.pointerId)) {
      shell.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <section
      ref={shellRef}
      aria-label="Brew score timeline"
      className="timeline-shell score-shell"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div className="mobile-timeline">
        <p className="eyebrow">Brew timeline</p>
        <ol>
          {recipe.timeline.map((step, index) => {
            const readout = `${eventWindowLabel(recipe.timeline, index)} · ${timelineScaleLabel(recipe.timeline, index)}`;
            return (
              <li className="mobile-step" key={step.id}>
                <div>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.type}</strong>
                </div>
                <p>{readout}</p>
                {step.note.trim() ? <small>{step.note}</small> : null}
              </li>
            );
          })}
        </ol>
      </div>
      <div
        className="score-canvas"
        style={{ minWidth: `${trackWidth}px`, height: `${trackHeight}px` }}
      >
        <div className="score-baseline" style={{ top: `${baseline}px` }} />
        {markers.map((marker) => {
          const isMinute = marker % 60 === 0;
          const markerLeft = 5 + (marker / length) * 90;
          return (
            <span
              className={isMinute ? "score-tick major" : "score-tick"}
              key={marker}
              style={{
                left: `${markerLeft}%`,
                top: `${isMinute ? baseline - 34 : baseline - 18}px`,
              }}
            >
              {isMinute ? <span>{formatTime(marker)}</span> : null}
            </span>
          );
        })}
        {recipe.timeline.map((step, index) => {
          const stepStart = eventStart(recipe.timeline, index);
          const stepDuration = eventDuration(recipe.timeline, index);
          const left = 5 + (stepStart / length) * 90;
          const width = Math.max(6, (stepDuration / length) * 90);
          const scaleTarget = step.target.trim();
          const cumulativeWeight = cumulativeWeightAt(recipe.timeline, index);
          const cumulativeLabel =
            cumulativeWeight === null ? "" : gramLabel(cumulativeWeight);
          const readout = `${eventWindowLabel(recipe.timeline, index)} · ${timelineScaleLabel(recipe.timeline, index)}`;
          const amount = eventWaterAmount(recipe.timeline, index);
          const discSize = Math.max(16, Math.min(34, 15 + amount / 9));
          const stem = [64, 92, 52, 78][index % 4];
          const labelTop = baseline + 18 + (index % 2) * 94;
          const labelShift = left < 12 ? 48 : left > 88 ? -48 : 0;
          const isRange = step.range || isDrawdownEvent(step);
          const eventLabel = [
            formatTime(stepStart),
            step.type,
            scaleTarget ? scaleLabel(step) : "",
            cumulativeLabel ? `${cumulativeLabel} cumulative` : "",
            step.note,
          ]
            .filter(Boolean)
            .join(" - ");

          if (isRange) {
            return (
              <div
                className="score-range"
                key={step.id}
                title={eventLabel}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top: `${baseline + 190}px`,
                }}
              >
                <strong>{step.type}</strong>
                <span className="score-readout">{readout}</span>
                {stepDuration >= 180 ? <b className="fast-forward">&gt;&gt;</b> : null}
                {step.note.trim() ? <small>{step.note}</small> : null}
              </div>
            );
          }

          return (
            <div
              className="score-note"
              key={step.id}
              title={eventLabel}
              style={{
                left: `${left}%`,
                "--stem": `${stem}px`,
                "--disc": `${discSize}px`,
                "--baseline": `${baseline}px`,
                "--label-top": `${labelTop}px`,
                "--label-shift": `${labelShift}px`,
              } as CSSProperties}
            >
              <span className="score-stem" />
              <span className={index === 0 ? "score-disc bloom-disc" : "score-disc"} />
              {cumulativeLabel ? (
                <span className="score-cumulative">{cumulativeLabel}</span>
              ) : null}
              <div className="score-note-label">
                <strong>{step.type}</strong>
                <span className="score-readout">{readout}</span>
                {step.note.trim() ? <small>{step.note}</small> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
