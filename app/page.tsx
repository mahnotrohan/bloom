"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
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
  roast: Roast;
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

const grinders = [
  "Comandante C40",
  "1Zpresso K-Ultra",
  "1Zpresso JX-Pro",
  "Timemore C3",
  "Baratza Encore",
  "Baratza Virtuoso+",
  "Fellow Ode Gen 2",
  "Niche Zero",
  "DF64",
  "Other - Conical Manual",
  "Other - Conical Electric",
  "Other - Flat Manual",
  "Other - Flat Electric",
];

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
    roast: "Medium-Light",
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
      event("Drawdown", 220, 55, "", false, true, "Target finish 4:35."),
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
    roast: "Light",
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
    roast: "Medium-Dark",
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
      event("Drawdown", 110, 420, "", false, true, "Long drip window."),
    ],
  },
];

const blankDraft: Draft = {
  title: "",
  brewer: "V60",
  dose: 18,
  ratio: 16.7,
  water: 300,
  grind: "Medium-Fine",
  grinder: "Fellow Ode Gen 2",
  clicks: "5",
  temp: 93,
  roast: "Medium-Light",
  bean: "Washed coffee, clean sweetness",
  agitation: "Moderate",
  pours: 3,
  stirs: 0,
  swirl: true,
  creator: "",
  timeline: [
    event("Bloom", 0, 40, "45", true, false, "Wet all grounds."),
    event("Pour", 40, 35, "180", false, false, "Steady spiral pour."),
    event("Pour", 100, 35, "300", false, false, "Finish through center."),
    event("Drawdown", 135, 60, "", false, true, "Flat bed at finish."),
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

function defaultRecipeTitle(recipe: Pick<Recipe, "brewer" | "dose" | "ratio" | "roast">) {
  return `${recipe.brewer} ${recipe.dose}g ${ratioLabel(recipe.ratio)} ${recipe.roast} roast`;
}

function recipeTitle(recipe: Pick<Recipe, "title" | "brewer" | "dose" | "ratio" | "roast">) {
  return recipe.title.trim() || defaultRecipeTitle(recipe);
}

function totalTime(events: TimelineEvent[]) {
  return Math.max(180, ...events.map((step) => step.start + step.duration));
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

function eventWindowLabel(step: TimelineEvent) {
  const start = formatTime(step.start);
  if (!step.range) return start;
  return `${start}-${formatTime(step.start + step.duration)}`;
}

function eventWaterAmount(events: TimelineEvent[], index: number) {
  const step = events[index];
  const current = targetNumber(step.target);
  if (current === null) return Math.max(12, step.duration / 2);
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
      ? migrateRecipes(JSON.parse(stored) as Array<Recipe & { yield?: number; saveCount?: number }>)
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

function normalizeStoredRecipe(recipe: Recipe & { yield?: number; saveCount?: number }) {
  const normalized = { ...recipe };
  delete normalized.yield;
  delete normalized.saveCount;
  return normalized as Recipe;
}

function migrateRecipes(recipes: Array<Recipe & { yield?: number; saveCount?: number }>) {
  return recipes.map(normalizeStoredRecipe);
}

function isReturningVisitor() {
  try {
    return readCookie(visitorCookieKey) === "1";
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
      const returningVisitor = isReturningVisitor();
      setRecipes(readRecipes());
      storageReady.current = true;
      writeCookie(visitorCookieKey, "1");

      if (window.location.hash.replace("#/", "").split("/")[0] === "builder") {
        setDraft((currentDraft) => ({
          ...currentDraft,
          creator: currentDraft.creator || readAuthorName(),
        }));
      }

      if (returningVisitor && !window.location.hash) {
        window.requestAnimationFrame(() => {
          document.getElementById("library")?.scrollIntoView({ block: "start" });
        });
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
          <strong>Brew Library</strong>
        </button>
        <div className="issue-meta">
          <span>A library of brew recipes</span>
        </div>
        <button className="primary-button" onClick={onCreate}>
          Write a recipe
        </button>
      </div>
      <div className="masthead-band">
        Browse, write, and share brew recipes
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
      <section className="hero-band">
        <div className="hero-grid">
          <div className="hero-copy">
            <div>
              <p className="eyebrow">Brew recipe library</p>
              <h1 className="journal-title">
                Brew coffee, log your favorite recipes, and share with everyone.
              </h1>
            </div>
            <p className="hero-dek">
              A shared space to write coffee recipes.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="primary-button" onClick={onCreate}>
                Write a recipe
              </button>
              <a className="secondary-button" href="#library">
                Browse library
              </a>
            </div>
          </div>
          <FeaturedSheet recipe={recipes[0] ?? seedRecipes[0]} />
        </div>
      </section>

      <section id="library" className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
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

  return (
    <article
      className="recipe-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleCardKeyDown}
    >
      <div>
        <div className="card-meta">
          <span>{recipe.brewer}</span>
          {recipe.ratio ? <span>{ratioLabel(recipe.ratio)}</span> : null}
        </div>
        <h3>{recipeTitle(recipe)}</h3>
        {recipe.bean.trim() ? <p>{recipe.bean}</p> : null}
      </div>
      <div className="recipe-stats">
        {recipe.dose ? <span>{recipe.dose}g coffee</span> : null}
        {recipe.water ? <span>{recipe.water}g water</span> : null}
        <span>{formatTime(totalTime(recipe.timeline))}</span>
      </div>
      {recipe.creator.trim() ? (
        <p className="creator-line">
          by {recipe.creator}
        </p>
      ) : null}
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
          Write a recipe
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
  const previewRecipe: Recipe = {
    ...draft,
    id: "preview",
    creator: draft.creator || "Guest brewer",
    createdAt: new Date().toISOString(),
  };

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    onDraft({ ...draft, [key]: value });
  }

  function setNumberField(key: keyof Draft, value: string) {
    const numberValue = Number(value);
    onDraft({ ...draft, [key]: Number.isFinite(numberValue) ? numberValue : 0 });
  }

  function updateDose(value: string) {
    const dose = Number(value);
    const nextDose = Number.isFinite(dose) ? dose : 0;
    onDraft({
      ...draft,
      dose: nextDose,
      water: Math.round(nextDose * draft.ratio),
    });
  }

  function updateRatio(value: string) {
    const ratio = Number(value);
    const nextRatio = Number.isFinite(ratio) ? ratio : 0;
    onDraft({
      ...draft,
      ratio: nextRatio,
      water: Math.round(draft.dose * nextRatio),
    });
  }

  function updateEvent(index: number, patch: Partial<TimelineEvent>) {
    onDraft({
      ...draft,
      timeline: draft.timeline.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...patch } : step,
      ),
    });
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
    <section className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)]">
      <div className="builder-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recipe builder</p>
            <h2>Header and brew timeline</h2>
          </div>
          <button className="primary-button" onClick={onPublish}>
            Publish
          </button>
        </div>

        {publishMessage ? <p className="notice">{publishMessage}</p> : null}

        <div className="form-grid">
          <label className="wide">
            Recipe title
            <input
              value={draft.title}
              onChange={(event) => setField("title", event.target.value)}
              placeholder={defaultRecipeTitle(draft)}
            />
          </label>
          <label>
            Brewer
            <select
              value={draft.brewer}
              onChange={(event) => setField("brewer", event.target.value as Brewer)}
            >
              {brewers.map((brewer) => (
                <option key={brewer}>{brewer}</option>
              ))}
            </select>
          </label>
          <label>
            Dose (g)
            <input type="number" value={draft.dose} onChange={(event) => updateDose(event.target.value)} />
          </label>
          <label>
            Ratio
            <input
              type="number"
              step="0.1"
              value={draft.ratio}
              onChange={(event) => updateRatio(event.target.value)}
            />
          </label>
          <label>
            Water (g)
            <input
              type="number"
              value={draft.water}
              onChange={(event) => setNumberField("water", event.target.value)}
            />
          </label>
          <label>
            Temperature (C)
            <input
              type="number"
              value={draft.temp}
              onChange={(event) => setNumberField("temp", event.target.value)}
            />
          </label>
          <label>
            Roast
            <select value={draft.roast} onChange={(event) => setField("roast", event.target.value as Roast)}>
              {["Light", "Medium-Light", "Medium", "Medium-Dark", "Dark"].map((roast) => (
                <option key={roast}>{roast}</option>
              ))}
            </select>
          </label>
          <label>
            Grind
            <select value={draft.grind} onChange={(event) => setField("grind", event.target.value as Grind)}>
              {["Fine", "Medium-Fine", "Medium", "Medium-Coarse", "Coarse"].map((grind) => (
                <option key={grind}>{grind}</option>
              ))}
            </select>
          </label>
          <label>
            Grinder
            <input list="grinders" value={draft.grinder} onChange={(event) => setField("grinder", event.target.value)} />
            <datalist id="grinders">
              {grinders.map((grinder) => (
                <option key={grinder}>{grinder}</option>
              ))}
            </datalist>
          </label>
          <label>
            Clicks / setting
            <input value={draft.clicks} onChange={(event) => setField("clicks", event.target.value)} />
          </label>
          <label>
            Agitation
            <select
              value={draft.agitation}
              onChange={(event) => setField("agitation", event.target.value as Agitation)}
            >
              {["Gentle", "Moderate", "Vigorous"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Pours
            <input
              type="number"
              value={draft.pours}
              onChange={(event) => setNumberField("pours", event.target.value)}
            />
          </label>
          <label>
            Stirs
            <input
              type="number"
              value={draft.stirs}
              onChange={(event) => setNumberField("stirs", event.target.value)}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={draft.swirl}
              onChange={(event) => setField("swirl", event.target.checked)}
            />
            Swirl
          </label>
          <label className="wide">
            Bean notes
            <input value={draft.bean} onChange={(event) => setField("bean", event.target.value)} />
          </label>
          <label>
            Your name
            <input
              value={draft.creator}
              onChange={(event) => setField("creator", event.target.value)}
              placeholder="Shown as recipe author"
            />
          </label>
        </div>

        <div className="timeline-editor">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Timeline</p>
              <h2>Events</h2>
            </div>
            <button className="secondary-button" onClick={addEvent}>
              Add event
            </button>
          </div>

          {draft.timeline.map((step, index) => (
            <div className="event-row" key={step.id}>
              <select
                value={step.type}
                onChange={(event) => updateEvent(index, { type: event.target.value })}
              >
                {eventTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              <label>
                Start
                <input
                  type="number"
                  value={step.start}
                  onChange={(event) => updateEvent(index, { start: Number(event.target.value) })}
                />
              </label>
              <label>
                Duration
                <input
                  type="number"
                  value={step.duration}
                  onChange={(event) => updateEvent(index, { duration: Number(event.target.value) })}
                />
              </label>
              <label>
                Scale
                <input
                  value={step.target}
                  onChange={(event) => updateEvent(index, { target: event.target.value })}
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={step.tare}
                  onChange={(event) => updateEvent(index, { tare: event.target.checked })}
                />
                Tare
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={step.range}
                  onChange={(event) => updateEvent(index, { range: event.target.checked })}
                />
                Range
              </label>
              <input
                className="event-note"
                value={step.note}
                placeholder="Note"
                onChange={(event) => updateEvent(index, { note: event.target.value })}
              />
              <button className="ghost-button" onClick={() => removeEvent(index)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <aside className="preview-panel">
        <p className="eyebrow">Live preview</p>
        <RecipeHeader recipe={previewRecipe} />
        <Timeline recipe={previewRecipe} />
      </aside>
    </section>
  );
}

function RecipePage({ recipe }: { recipe: Recipe }) {
  return (
    <section className="recipe-page print-page">
      <div className="recipe-actions">
        <div>
          <p className="eyebrow share-path">/{slugify(recipe.creator) || "guest"}/{recipe.id}</p>
        </div>
        <div className="action-group">
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
        {recipe.temp ? <Metric label="Temp" value={`${recipe.temp}C`} /> : null}
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
  const trackWidth = Math.max(880, length * 3.1);
  const baseline = 140;
  const trackHeight = 460;
  const markers = Array.from({ length: Math.floor(length / 15) + 1 }, (_, index) => index * 15);

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    const shell = shellRef.current;
    if (!shell || event.button !== 0) return;
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
          const left = 5 + (step.start / length) * 90;
          const width = Math.max(6, (step.duration / length) * 90);
          const scaleTarget = step.target.trim();
          const cumulativeWeight = cumulativeWeightAt(recipe.timeline, index);
          const cumulativeLabel =
            cumulativeWeight === null ? "" : gramLabel(cumulativeWeight);
          const readout = `${eventWindowLabel(step)} · ${timelineScaleLabel(recipe.timeline, index)}`;
          const amount = eventWaterAmount(recipe.timeline, index);
          const discSize = Math.max(16, Math.min(34, 15 + amount / 9));
          const stem = [64, 92, 52, 78][index % 4];
          const labelTop = baseline + 18 + (index % 2) * 94;
          const labelShift = left < 12 ? 48 : left > 88 ? -48 : 0;
          const isRange = step.range;
          const eventLabel = [
            formatTime(step.start),
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
                  top: `${baseline + 220}px`,
                }}
              >
                <strong>{step.type}</strong>
                <span className="score-readout">{readout}</span>
                {step.duration >= 180 ? <b className="fast-forward">&gt;&gt;</b> : null}
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
