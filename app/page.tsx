"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
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

async function exportRecipeJpeg(recipe: Recipe) {
  const width = 1400;
  const stepHeight = 142;
  const height = 650 + recipe.timeline.length * stepHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Canvas is unavailable");

  context.fillStyle = "#f7f5f2";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.roundRect(70, 70, width - 140, height - 140, 24);
  context.fill();
  context.strokeStyle = "#e5ddd2";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#486c63";
  context.font = "700 22px Inter, Arial, sans-serif";
  context.fillText(recipe.brewer.toUpperCase(), 130, 145);

  context.fillStyle = "#20201e";
  context.font = "650 52px Inter, Arial, sans-serif";
  const titleLines = wrapCanvasText(context, recipeTitle(recipe), 1100).slice(0, 2);
  titleLines.forEach((line, index) => context.fillText(line, 130, 215 + index * 60));
  const titleBottom = 215 + (titleLines.length - 1) * 60;

  if (recipe.bean.trim()) {
    context.fillStyle = "#6e6b66";
    context.font = "400 25px Inter, Arial, sans-serif";
    context.fillText(recipe.bean, 130, titleBottom + 48);
  }

  const metrics = [
    ["COFFEE", `${recipe.dose}g`],
    ["RATIO", ratioLabel(recipe.ratio)],
    ["WATER", `${recipe.water}g`],
    ["TEMP", `${recipe.temp}°C`],
    ["TIME", formatTime(totalTime(recipe.timeline))],
  ];
  const metricsTop = titleBottom + 92;
  const metricWidth = 228;

  context.strokeStyle = "#e5ddd2";
  context.beginPath();
  context.roundRect(130, metricsTop, 1140, 112, 14);
  context.stroke();
  metrics.forEach(([label, value], index) => {
    const x = 130 + index * metricWidth;
    if (index) {
      context.beginPath();
      context.moveTo(x, metricsTop);
      context.lineTo(x, metricsTop + 112);
      context.stroke();
    }
    context.fillStyle = "#6e6b66";
    context.font = "700 16px Inter, Arial, sans-serif";
    context.fillText(label, x + 24, metricsTop + 35);
    context.fillStyle = "#20201e";
    context.font = "650 31px Inter, Arial, sans-serif";
    context.fillText(value, x + 24, metricsTop + 78);
  });

  const timelineTop = metricsTop + 176;
  context.fillStyle = "#20201e";
  context.font = "650 28px Inter, Arial, sans-serif";
  context.fillText("Brew timeline", 130, timelineTop);
  context.fillStyle = "#6e6b66";
  context.font = "400 19px Inter, Arial, sans-serif";
  context.fillText(`${recipe.timeline.length} steps`, 1150, timelineTop);

  const lineX = 158;
  const firstStepY = timelineTop + 70;
  const lastStepY = firstStepY + Math.max(0, recipe.timeline.length - 1) * stepHeight;
  context.strokeStyle = "#e5ddd2";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(lineX, firstStepY);
  context.lineTo(lineX, lastStepY);
  context.stroke();

  recipe.timeline.forEach((step, index) => {
    const y = firstStepY + index * stepHeight;
    const readout = `${eventWindowLabel(recipe.timeline, index)} · ${timelineScaleLabel(recipe.timeline, index)}`;
    context.fillStyle = isDrawdownEvent(step) ? "#486c63" : "#d89b45";
    context.beginPath();
    context.arc(lineX, y, 13, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 5;
    context.stroke();

    context.fillStyle = "#20201e";
    context.font = "650 25px Inter, Arial, sans-serif";
    context.fillText(step.type, 205, y + 4);
    context.fillStyle = "#6e6b66";
    context.font = "600 19px Inter, Arial, sans-serif";
    context.fillText(readout, 880, y + 3);
    if (step.note.trim()) {
      context.font = "400 20px Inter, Arial, sans-serif";
      wrapCanvasText(context, step.note, 920)
        .slice(0, 2)
        .forEach((line, lineIndex) => context.fillText(line, 205, y + 42 + lineIndex * 28));
    }
  });

  context.fillStyle = "#6e6b66";
  context.font = "500 18px Inter, Arial, sans-serif";
  context.fillText("Bloom", 130, height - 105);
  if (recipe.creator.trim()) {
    context.textAlign = "right";
    context.fillText(`Recipe by ${recipe.creator}`, width - 130, height - 105);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("JPEG export failed")),
      "image/jpeg",
      0.94,
    );
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(recipeTitle(recipe)) || "brew-recipe"}.jpeg`;
  link.click();
  URL.revokeObjectURL(url);
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

  useEffect(() => {
    const hydrateStorage = window.setTimeout(() => {
      const cached = readRecipes();
      setRecipes(cached);
      storageReady.current = true;
      writeCookie(visitorCookieKey, "1");

      // Reconcile with shared server storage (D1). The server is the source of
      // truth; any recipe that exists only on this device (e.g. published
      // before sync existed, or while offline) is pushed up so it stops being
      // device-only. Seed recipes are never uploaded. If the server is
      // unreachable, we silently keep the localStorage view.
      void (async () => {
        const server = await fetchServerRecipes();
        if (!server) return;
        const seedIds = new Set(seedRecipes.map((recipe) => recipe.id));
        const serverIds = new Set(server.map((recipe) => recipe.id));
        const localOnly = cached.filter(
          (recipe) => !serverIds.has(recipe.id) && !seedIds.has(recipe.id),
        );
        localOnly.forEach((recipe) => void saveServerRecipe(recipe));
        const merged = [...server, ...localOnly];
        if (!merged.length) return; // keep the seed fallback until something is stored
        setRecipes(merged);
        try {
          window.localStorage.setItem(recipeStorageKey, JSON.stringify(merged));
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
    go("recipe", recipe.id);
  }

  return (
    <main className="min-h-screen bg-[var(--oat)] text-[var(--ink)]">
      <Header onCreate={startNewRecipe} onHome={() => go("home")} />
      {view === "builder" ? (
        <Builder
          draft={draft}
          onDraft={setDraft}
          onPublish={publishRecipe}
          publishMessage={publishMessage}
        />
      ) : view === "recipe" ? (
        <RecipePage recipe={activeRecipe} />
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
        />
      )}
    </main>
  );
}

function Header({ onCreate, onHome }: { onCreate: () => void; onHome: () => void }) {
  return (
    <header className="site-masthead">
      <div className="masthead-inner">
        <button className="brand-lockup" onClick={onHome}>
          <strong>Bloom</strong>
        </button>
        <nav className="site-nav" aria-label="Primary navigation">
          <button className="ghost-button" onClick={onHome}>Library</button>
          <button className="primary-button" onClick={onCreate}>Write recipe</button>
        </nav>
      </div>
    </header>
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
}: {
  recipes: Recipe[];
  search: string;
  brewerFilter: string;
  onSearch: (value: string) => void;
  onBrewerFilter: (value: string) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
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
}: {
  recipe: Recipe;
  onOpen: () => void;
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
      {author ? <p className="creator-line">by {author}</p> : null}
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
    const patch: Partial<TimelineEvent> = { type };

    if (type === "Drawdown") {
      patch.start = previousEnd;
      patch.duration = Math.max(step.duration, previousEnd + 60);
      patch.range = true;
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
          <select value={draft.brewer} onChange={(e) => setField("brewer", e.target.value as Brewer)}>
            {brewers.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
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
                <details className="step-more">
                  <summary aria-label="More options">&#8943;</summary>
                  <div className="step-adv">
                    <label>
                      Duration (s)
                      <input
                        type="number"
                        value={numberInputValue(step.duration)}
                        onChange={(e) => updateEvent(index, { duration: readNumberInput(e.target.value) })}
                      />
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={step.range} onChange={(e) => updateEvent(index, { range: e.target.checked })} />
                      Time range
                    </label>
                    <button className="ghost-button" onClick={() => removeEvent(index)}>
                      Remove step
                    </button>
                  </div>
                </details>
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

function RecipePage({ recipe }: { recipe: Recipe }) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportRecipeJpeg(recipe);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="recipe-page print-page">
      <div className="recipe-actions">
        <div>
          <p className="eyebrow share-path">/{slugify(recipe.creator) || "guest"}/{recipe.id}</p>
        </div>
        <div className="action-group">
          <button className="primary-button" disabled={isExporting} onClick={handleExport}>
            {isExporting ? "Exporting..." : "Export JPEG"}
          </button>
          <button className="secondary-button" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>
      <div className="public-recipe">
        <RecipeHeader recipe={recipe} />
        <Timeline recipe={recipe} />
      </div>
    </section>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
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
