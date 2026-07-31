"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================================
   Grind guide — an interactive grind-size reference.

   The slider runs over a micron continuum rather than the five coarse buckets
   Bloom stores on a recipe, because every real grind decision happens between
   the buckets. Everything else on the page (texture, brew methods, grinder
   settings, Bloom's own label) is derived from that one number.
   ========================================================================== */

/* Shared grind model. These tables used to live here; they now live in
   app/lib/grind.ts so the recipe page, the share card and this guide cannot
   drift apart. */
import {
  MIN_MICRONS,
  MAX_MICRONS,
  methods,
  grinders,
  bandFor,
  bloomLabelFor,
  distanceFromRange,
  settingFor,
} from "./lib/grind";

/* ---------------------------------------------------------------------------
   Particle field

   Positions and shapes are generated once from a fixed seed so that dragging
   the slider grows and shrinks the same grounds instead of reshuffling them
   into visual noise. Only the radius is a function of the current setting.
   ------------------------------------------------------------------------- */

type Particle = {
  x: number;
  y: number;
  /** Multiplier on the nominal diameter — real grinds are never uniform. */
  scale: number;
  rotation: number;
  vertices: number[];
  tone: number;
};

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildParticles(count: number): Particle[] {
  const rand = mulberry32(20260728);
  const out: Particle[] = [];
  for (let i = 0; i < count; i += 1) {
    // ~14% fines, the rest clustered around the nominal size.
    const isFine = rand() < 0.14;
    const spread = rand() + rand() + rand(); // 0..3, roughly bell-shaped
    const scale = isFine ? 0.18 + rand() * 0.22 : 0.62 + (spread / 3) * 0.85;
    const sides = 6 + Math.floor(rand() * 4);
    const vertices: number[] = [];
    for (let v = 0; v < sides; v += 1) vertices.push(0.68 + rand() * 0.46);
    out.push({
      x: rand(),
      y: rand(),
      scale,
      rotation: rand() * Math.PI * 2,
      vertices,
      tone: rand(),
    });
  }
  return out;
}

/**
 * Sized so that coverage stays constant from espresso upward. Below ~200 µm the
 * bed does thin out, which is the honest cost of drawing at a fixed scale — the
 * alternative is lying about how small those particles are.
 */
const PARTICLE_POOL = buildParticles(4000);

function GrindCanvas({
  microns,
  pxPerMm,
  magnification,
}: {
  microns: number;
  pxPerMm: number;
  magnification: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 640, height: 260 });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width) setSize({ width: rect.width, height: rect.height || 260 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dragging the slider fires a stream of updates; coalesce them to one paint
    // per frame so a fine grind (thousands of particles) still feels smooth.
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(size.width * dpr);
      canvas.height = Math.round(size.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.width, size.height);

      const nominalPx = (microns / 1000) * pxPerMm * magnification;
      const radius = nominalPx / 2;

      // Hold total coverage roughly constant so the bed reads as the same pile
      // of coffee at every setting — only the particle size should change.
      const bedArea = size.width * size.height;
      const meanArea = Math.PI * radius * radius * 0.62;
      const target = Math.round((bedArea * 0.42) / Math.max(meanArea, 0.35));
      const count = Math.max(40, Math.min(PARTICLE_POOL.length, target));

      for (let i = 0; i < count; i += 1) {
        const p = PARTICLE_POOL[i];
        const r = radius * p.scale;
        if (r < 0.16) continue;
        const cx = p.x * size.width;
        const cy = p.y * size.height;

        const light = 26 + p.tone * 22;
        const hue = 22 + p.tone * 10;
        const sat = 26 + p.tone * 16;
        ctx.fillStyle = `hsl(${hue} ${sat}% ${light}%)`;

        if (r < 0.9) {
          // Below a pixel, polygons are pointless — dots read more honestly.
          ctx.globalAlpha = Math.max(0.35, Math.min(1, r / 0.9));
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(r, 0.35), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          continue;
        }

        ctx.beginPath();
        const sides = p.vertices.length;
        for (let v = 0; v < sides; v += 1) {
          const angle = p.rotation + (v / sides) * Math.PI * 2;
          const rv = r * p.vertices[v];
          const x = cx + Math.cos(angle) * rv;
          const y = cy + Math.sin(angle) * rv;
          if (v === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();

        if (r > 3) {
          ctx.fillStyle = `hsl(${hue + 6} ${sat}% ${light + 13}%)`;
          ctx.beginPath();
          ctx.ellipse(cx - r * 0.22, cy - r * 0.24, r * 0.34, r * 0.26, p.rotation, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    // Dragging the slider fires a stream of updates; coalesce them to one paint
    // per frame so a fine grind (thousands of particles) still feels smooth.
    const frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [microns, pxPerMm, magnification, size]);

  return (
    <div className="grind-canvas-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="grind-canvas"
        style={{ width: "100%", height: "100%" }}
        role="img"
        aria-label={`Grind texture at approximately ${microns} microns`}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Screen calibration

   "Actual size" is only meaningful if we know the physical size of a pixel, and
   the browser won't tell us. So the user matches an on-screen rectangle to a
   bank card (ID-1, 85.60 mm wide) once, and we remember it.
   ------------------------------------------------------------------------- */

const CARD_WIDTH_MM = 85.6;
const calibrationKey = "bloom.grind.pxPerMm";

function CalibrationPanel({
  pxPerMm,
  onChange,
  onClose,
}: {
  pxPerMm: number;
  onChange: (value: number) => void;
  onClose: () => void;
}) {
  const cardWidthPx = pxPerMm * CARD_WIDTH_MM;
  return (
    <div className="grind-calibrate">
      <p className="grind-calibrate-copy">
        Hold a bank card, Aadhaar card, or any ID against the screen and drag until the outline
        matches its width. Bloom remembers this for next time.
      </p>
      <div className="grind-card-outline" style={{ width: `${cardWidthPx}px` }}>
        <span>85.6 mm</span>
      </div>
      <input
        type="range"
        min={2.2}
        max={9}
        step={0.01}
        value={pxPerMm}
        aria-label="Screen calibration"
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="grind-calibrate-actions">
        <span className="grind-calibrate-value">{pxPerMm.toFixed(2)} px / mm</span>
        <button className="ghost-button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

export default function GrindGuide({
  initialMicrons,
  onCreate,
  onBrowse,
}: {
  initialMicrons?: number;
  onCreate: () => void;
  onBrowse: () => void;
}) {
  const [microns, setMicrons] = useState(() => {
    const start = initialMicrons ?? 750;
    return Math.min(MAX_MICRONS, Math.max(MIN_MICRONS, start));
  });
  const [actualSize, setActualSize] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  // 3.78 px/mm is the CSS 96 dpi assumption — a fine default until calibrated.
  // Read lazily rather than in an effect: nothing rendered on the server depends
  // on it (the canvas is drawn client-side, the calibration panel starts closed),
  // so there is no hydration mismatch to worry about.
  const [pxPerMm, setPxPerMm] = useState(() => {
    if (typeof window === "undefined") return 3.78;
    try {
      const parsed = Number(window.localStorage.getItem(calibrationKey));
      return Number.isFinite(parsed) && parsed > 1 ? parsed : 3.78;
    } catch {
      return 3.78;
    }
  });
  const [copied, setCopied] = useState(false);

  function updateCalibration(value: number) {
    setPxPerMm(value);
    try {
      window.localStorage.setItem(calibrationKey, String(value));
    } catch {
      // ignore
    }
  }

  // Keep the deep link in sync so any setting can be shared or pinned to a recipe.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = `#/grind/${microns}`;
      if (window.location.hash !== next) {
        window.history.replaceState(null, "", next);
      }
    }, 220);
    return () => window.clearTimeout(id);
  }, [microns]);

  const band = bandFor(microns);
  const bloomLabel = bloomLabelFor(microns);

  const ranked = useMemo(
    () =>
      methods
        .map((m) => ({ ...m, distance: distanceFromRange(microns, m.low, m.high) }))
        .sort((a, b) => a.distance - b.distance),
    [microns],
  );
  const matching = ranked.filter((m) => m.distance === 0);
  const headline = matching[0] ?? ranked[0];

  // At actual size a 0.8 mm particle is ~3 px, which is true but unreadable, so
  // the default view is magnified and says so out loud.
  const magnification = actualSize ? 1 : 8;

  function percentFor(value: number) {
    return ((value - MIN_MICRONS) / (MAX_MICRONS - MIN_MICRONS)) * 100;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/#/grind/${microns}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — the address bar already holds the link
    }
  }

  return (
    <section className="grind-page mx-auto px-5 sm:px-8">
      <p className="eyebrow">Reference</p>
      <h1 className="grind-title">Grind size guide</h1>
      <p className="grind-lead">
        Drag to move through the grind continuum. Every recipe in Bloom sits somewhere on this line —
        find the texture you brewed, and read off the brewer, the label, and roughly where your
        grinder should sit.
      </p>

      <div className="grind-stage">
        <GrindCanvas microns={microns} pxPerMm={pxPerMm} magnification={magnification} />
        <div className="grind-stage-tag">
          {actualSize ? "Actual size (1:1)" : "Magnified 8×"}
        </div>
      </div>

      <div className="grind-scale">
        <input
          className="grind-slider"
          type="range"
          min={MIN_MICRONS}
          max={MAX_MICRONS}
          step={10}
          value={microns}
          aria-label="Grind size in microns"
          onChange={(e) => setMicrons(Number(e.target.value))}
        />
        <div className="grind-scale-ends">
          <span>Extra fine</span>
          <span>Coarse</span>
        </div>
      </div>

      <div className="grind-readout">
        <div className="grind-readout-main">
          <p className="grind-readout-label">{band.label}</p>
          <p className="grind-readout-microns">
            ≈ {microns} <span>µm</span>
          </p>
        </div>
        <dl className="grind-readout-meta">
          <div>
            <dt>Feels like</dt>
            <dd>{band.like}</dd>
          </div>
          <div>
            <dt>Bloom label</dt>
            <dd>{bloomLabel}</dd>
          </div>
          <div>
            <dt>Closest brewer</dt>
            <dd>{headline.name}</dd>
          </div>
        </dl>
        <p className="grind-readout-note">{headline.note}</p>
      </div>

      <div className="grind-view-controls">
        <label className="grind-switch">
          <input
            type="checkbox"
            checked={actualSize}
            onChange={(e) => {
              setActualSize(e.target.checked);
              if (e.target.checked) setCalibrating(true);
            }}
          />
          Show at actual size
        </label>
        {actualSize ? (
          <button className="ghost-button" onClick={() => setCalibrating((v) => !v)}>
            {calibrating ? "Hide calibration" : "Calibrate screen"}
          </button>
        ) : null}
        <button className="ghost-button" onClick={copyLink}>
          {copied ? "Link copied" : "Copy link to this grind"}
        </button>
      </div>

      {actualSize && calibrating ? (
        <CalibrationPanel
          pxPerMm={pxPerMm}
          onChange={updateCalibration}
          onClose={() => setCalibrating(false)}
        />
      ) : null}

      <div className="grind-block">
        <h2>Where the brewers sit</h2>
        <p className="grind-block-copy">
          Tap any brewer to jump the slider to the middle of its range. Overlaps are real — two
          brewers wanting the same grind is normal.
        </p>
        <ul className="grind-methods">
          {methods.map((method) => {
            const active = distanceFromRange(microns, method.low, method.high) === 0;
            const left = percentFor(method.low);
            const width = percentFor(method.high) - left;
            return (
              <li key={method.name} className={active ? "grind-method is-active" : "grind-method"}>
                <button onClick={() => setMicrons(Math.round((method.low + method.high) / 2 / 10) * 10)}>
                  <span className="grind-method-name">{method.name}</span>
                  <span className="grind-method-track">
                    <span
                      className="grind-method-bar"
                      style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
                    />
                  </span>
                  <span className="grind-method-range">
                    {method.low}–{method.high} µm
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grind-block">
        <h2>Roughly where your grinder sits</h2>
        <p className="grind-block-copy">
          Starting points, not settings. Zero points drift, burrs differ between units, and a
          seasoned burr set runs coarser than a new one. Land here, then dial by taste.
        </p>
        <ul className="grind-grinders">
          {grinders.map((grinder) => {
            const result = settingFor(grinder, microns);
            return (
              <li key={grinder.name}>
                <div className="grind-grinder-name">
                  {grinder.name}
                  <span>{grinder.note}</span>
                </div>
                <div className="grind-grinder-value">
                  {result ? (
                    <>
                      <strong>{result.value}</strong>
                      <span>{result.unit === "clicks" ? "clicks" : "setting"}</span>
                    </>
                  ) : (
                    <span className="grind-grinder-out">out of range</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grind-block">
        <h2>Reading it in the cup</h2>
        <div className="grind-taste">
          <div>
            <p className="grind-taste-head">Too coarse</p>
            <p>Sour, thin, salty, watery finish. Brew runs fast. Go finer in small steps.</p>
          </div>
          <div>
            <p className="grind-taste-head">Too fine</p>
            <p>Bitter, drying, hollow middle. Brew stalls or clogs. Go coarser in small steps.</p>
          </div>
        </div>
        <p className="grind-block-copy">
          Change one thing at a time. A couple of clicks moves a cup more than most people expect —
          and if the brew time shifts by more than 30 seconds, the grind moved too far.
        </p>
      </div>

      <div className="grind-cta">
        <button className="primary-button" onClick={onCreate}>
          Write a recipe
        </button>
        <button className="secondary-button" onClick={onBrowse}>
          Browse the library
        </button>
      </div>
    </section>
  );
}
