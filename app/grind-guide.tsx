"use client";

import { useEffect, useMemo, useState } from "react";

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

/* The particle field and canvas now live in app/lib/grind-canvas.tsx so the
   recipe page, brew screen and shared /r/<id> page can draw the same grounds. */
import {
  GrindCanvas,
  CARD_WIDTH_MM,
  calibrationKey,
  readPxPerMm,
} from "./lib/grind-canvas";

/* ---------------------------------------------------------------------------
   Screen calibration

   "Actual size" is only meaningful if we know the physical size of a pixel, and
   the browser won't tell us. So the user matches an on-screen rectangle to a
   bank card (ID-1, 85.60 mm wide) once, and we remember it.
   ------------------------------------------------------------------------- */

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
  const [pxPerMm, setPxPerMm] = useState(readPxPerMm);
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
