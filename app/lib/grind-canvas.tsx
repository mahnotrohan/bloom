"use client";

/* ============================================================================
   Grind texture rendering.

   Extracted from grind-guide.tsx so the recipe page, the brew screen and the
   shared /r/<id> page can draw the same grounds. The guide owns the big slider
   view; everything else uses <GrindSwatch> for a small, fixed-size sample.

   Why generated rather than photographed: a photo can't render a continuous
   value (685 µm), can't be drawn at true 1:1 for comparison against real
   grounds, and — without a reference object in frame — 600 µm and 700 µm are
   indistinguishable anyway. Particle size, spread and count are all functions
   of microns, so the picture is derived from the same number as the text.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { bandFor, type Confidence } from "./grind";

export type Particle = {
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

/**
 * R2 low-discrepancy sequence. Positions come from this rather than from the
 * random generator because the renderer draws the *first N* particles of the
 * pool, and N is small on a swatch — 6 particles for a coarse grind. Plain
 * random positions clump badly at that size, leaving half the bed empty and
 * making coarse look like a sparse accident. Any prefix of an R2 sequence is
 * evenly spread, which is exactly the property needed here.
 */
const R2_A = 0.7548776662466927;
const R2_B = 0.5698402909980532;

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
    // Jitter keeps the sequence from reading as a visible lattice.
    const jx = (rand() - 0.5) * 0.06;
    const jy = (rand() - 0.5) * 0.06;
    out.push({
      x: Math.min(1, Math.max(0, ((i + 1) * R2_A) % 1 + jx)),
      y: Math.min(1, Math.max(0, ((i + 1) * R2_B) % 1 + jy)),
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

export const CARD_WIDTH_MM = 85.6;
export const calibrationKey = "bloom.grind.pxPerMm";
/** The CSS 96 dpi assumption — a fine default until the user calibrates. */
export const DEFAULT_PX_PER_MM = 3.78;

export function readPxPerMm(): number {
  if (typeof window === "undefined") return DEFAULT_PX_PER_MM;
  try {
    const parsed = Number(window.localStorage.getItem(calibrationKey));
    return Number.isFinite(parsed) && parsed > 1 ? parsed : DEFAULT_PX_PER_MM;
  } catch {
    return DEFAULT_PX_PER_MM;
  }
}

/**
 * How wide to spread particle sizes around the nominal. A well-made conical burr
 * produces a tight distribution; an uncalibrated or unknown grinder does not. We
 * already track that as `confidence`, so the picture can tell the same truth the
 * caveats do instead of flattering every grinder equally.
 */
export function spreadFor(confidence: Confidence | undefined): number {
  switch (confidence) {
    case "high":
      return 1;
    case "medium":
      return 1.15;
    case "low":
      return 1.35;
    default:
      return 1.6;
  }
}

/**
 * Paints a bed of grounds. `spread` > 1 exaggerates the size variation without
 * moving the median, which is what a worse grinder actually does.
 */
export function paintGrind(
  ctx: CanvasRenderingContext2D,
  opts: {
    width: number;
    height: number;
    microns: number;
    pxPerMm: number;
    magnification: number;
    spread?: number;
  },
) {
  const { width, height, microns, pxPerMm, magnification } = opts;
  const spread = opts.spread ?? 1;

  ctx.clearRect(0, 0, width, height);

  const nominalPx = (microns / 1000) * pxPerMm * magnification;
  const radius = nominalPx / 2;

  // Hold total coverage roughly constant so the bed reads as the same pile of
  // coffee at every setting — only the particle size should change.
  const bedArea = width * height;
  const meanArea = Math.PI * radius * radius * 0.62;
  const target = Math.round((bedArea * 0.42) / Math.max(meanArea, 0.35));

  // The minimum has to scale with the bed, not be a constant. A floor of 40 is
  // right for the guide's ~640x260 stage but catastrophic in a 124x70 swatch:
  // a coarse grind wants ~6 particles there, and forcing 40 produced ~295%
  // coverage — a solid mat in which coarse and fine looked identical.
  // 4200 is chosen so the big stage still floors at 40, preserving the guide.
  const floor = Math.max(6, Math.round(bedArea / 4200));
  const count = Math.max(floor, Math.min(PARTICLE_POOL.length, target));

  for (let i = 0; i < count; i += 1) {
    const p = PARTICLE_POOL[i];
    // Push each particle's deviation from 1.0 outward by the spread factor.
    const scaled = spread === 1 ? p.scale : 1 + (p.scale - 1) * spread;
    const r = radius * Math.max(0.08, scaled);
    if (r < 0.16) continue;
    const cx = p.x * width;
    const cy = p.y * height;

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
}

/** The guide's full-width, self-measuring canvas. */
export function GrindCanvas({
  microns,
  pxPerMm,
  magnification,
  spread,
}: {
  microns: number;
  pxPerMm: number;
  magnification: number;
  spread?: number;
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
    const frame = window.requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(size.width * dpr);
      canvas.height = Math.round(size.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintGrind(ctx, {
        width: size.width,
        height: size.height,
        microns,
        pxPerMm,
        magnification,
        spread,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [microns, pxPerMm, magnification, spread, size]);

  return (
    <div className="grind-canvas-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="grind-canvas"
        style={{ width: "100%", height: "100%" }}
        role="img"
        aria-label={`Grind texture at approximately ${Math.round(microns)} microns`}
      />
    </div>
  );
}

/**
 * Fixed-size sample for the recipe panel, brew screen and shared page.
 * Magnified 8× by default, matching the guide: at true scale a 620 µm particle
 * is about 2 px, which is accurate and unreadable.
 */
export function GrindSwatch({
  microns,
  width = 124,
  height = 70,
  magnification = 8,
  spread,
  className,
}: {
  microns: number;
  width?: number;
  height?: number;
  magnification?: number;
  spread?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintGrind(ctx, {
      width,
      height,
      microns,
      // The swatch is a sample, not a ruler, so it always uses the nominal
      // pixel density. 1:1 lives in the guide, where calibration is explained.
      pxPerMm: DEFAULT_PX_PER_MM,
      magnification,
      spread,
    });
  }, [microns, width, height, magnification, spread]);

  return (
    <canvas
      ref={canvasRef}
      className={className ? `grind-swatch ${className}` : "grind-swatch"}
      style={{ width, height }}
      role="img"
      aria-label={`Grind texture, roughly ${Math.round(microns)} microns, like ${bandFor(microns).like}`}
    />
  );
}
