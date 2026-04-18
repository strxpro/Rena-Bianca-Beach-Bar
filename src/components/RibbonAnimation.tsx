"use client";

import { useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════
   RIBBON ANIMATION — Twisting ribbon canvas effect
   Adapted from p5.js sketch to pure HTML5 Canvas.
   Colors tuned to the site's Mediterranean palette.
   ═══════════════════════════════════════════════════════════════ */

/* ── Ribbon geometry ── */
const SEGMENTS = 400;
const RIBBON_HALF_W = 14;
const RIBBON_X_SCALE = 1.4;
const RIBBON_X_OFFSET = 0.2;

/* ── Wave / motion ── */
const WAVE_SPEED = 0.018;
const WAVE1_FREQ = 3.5;
const WAVE1_TIME_SPEED = 0.7;
const WAVE1_AMP = 110;
const WAVE2_FREQ = 7.0;
const WAVE2_TIME_SPEED = 1.1;
const WAVE2_AMP = 30;

/* ── Twist ── */
const TWIST_CYCLES = 6;
const TWIST_TIME_SPEED = 0.5;

/* ── Color palette (site-matched) ── */
const COLOR_FACE: RGB = [253, 251, 247];      // sand — visible on flat face
const COLOR_FOLD_A: RGB = [59, 130, 196];     // ocean blue
const COLOR_FOLD_B: RGB = [42, 106, 158];     // deep ocean
const COLOR_FOLD_C: RGB = [124, 185, 232];    // sky blue accent

const COLOR_CYCLE_FREQ = 2.0;
const COLOR_CYCLE_SPEED = 0.3;
const FACE_BLEND_GAMMA = 1.2;

/* ── Shadow ── */
const SHADOW_COLOR: RGB = [5, 12, 25];
const SHADOW_ALPHA = 14;
const SHADOW_OFFSET_X = 4;
const SHADOW_OFFSET_Y = 7;

/* ── Edge lines ── */
const EDGE_MIN_TWIST = 0.08;
const EDGE_COLOR: RGB = [253, 251, 247];
const EDGE_ALPHA = 18;
const EDGE_WEIGHT = 0.5;

type RGB = [number, number, number];
type Pt = { x: number; y: number };

function lerpColor(a: RGB, b: RGB, f: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

function buildSpine(time: number, w: number, h: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const progress = i / SEGMENTS;
    pts.push({
      x: progress * w * RIBBON_X_SCALE - w * RIBBON_X_OFFSET,
      y:
        h / 2 +
        Math.sin(progress * Math.PI * WAVE1_FREQ + time * WAVE1_TIME_SPEED) * WAVE1_AMP +
        Math.sin(progress * Math.PI * WAVE2_FREQ + time * WAVE2_TIME_SPEED) * WAVE2_AMP,
    });
  }
  return pts;
}

function buildNormals(pts: Pt[]): { nx: number; ny: number }[] {
  const last = pts.length - 1;
  return pts.map((_, i) => {
    const dx =
      i === 0 ? pts[1].x - pts[0].x : i === last ? pts[last].x - pts[last - 1].x : pts[i + 1].x - pts[i - 1].x;
    const dy =
      i === 0 ? pts[1].y - pts[0].y : i === last ? pts[last].y - pts[last - 1].y : pts[i + 1].y - pts[i - 1].y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { nx: -dy / len, ny: dx / len };
  });
}

function buildEdges(
  pts: Pt[],
  normals: { nx: number; ny: number }[],
  time: number
): { tops: Pt[]; bots: Pt[]; twists: number[] } {
  const tops: Pt[] = [];
  const bots: Pt[] = [];
  const twists: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const twist = Math.cos((i / SEGMENTS) * Math.PI * TWIST_CYCLES + time * TWIST_TIME_SPEED);
    const w = RIBBON_HALF_W * Math.abs(twist);
    const sign = twist >= 0 ? 1 : -1;
    twists.push(twist);
    tops.push({ x: pts[i].x + normals[i].nx * w * sign, y: pts[i].y + normals[i].ny * w * sign });
    bots.push({ x: pts[i].x - normals[i].nx * w * sign, y: pts[i].y - normals[i].ny * w * sign });
  }
  return { tops, bots, twists };
}

function getFoldColor(frac: number, time: number): RGB {
  const cycle = (((frac * COLOR_CYCLE_FREQ + time * COLOR_CYCLE_SPEED) % 1) + 1) % 1;
  if (cycle < 1 / 3) return lerpColor(COLOR_FOLD_A, COLOR_FOLD_B, cycle * 3);
  if (cycle < 2 / 3) return lerpColor(COLOR_FOLD_B, COLOR_FOLD_C, (cycle - 1 / 3) * 3);
  return lerpColor(COLOR_FOLD_C, COLOR_FOLD_A, (cycle - 2 / 3) * 3);
}

function getRibbonColor(frac: number, twist: number, time: number): RGB {
  const foldColor = getFoldColor(frac, time);
  const facedness = Math.pow(Math.abs(twist), FACE_BLEND_GAMMA);
  return lerpColor(foldColor, COLOR_FACE, facedness);
}

export default function RibbonAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let t = 0;
    let raf = 0;
    let W = 680;
    let H = 420;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const drawQuad = (
      ax: number, ay: number, bx: number, by: number,
      cx: number, cy: number, dx: number, dy: number,
      fillStyle: string
    ) => {
      ctx.fillStyle = fillStyle;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx, cy);
      ctx.lineTo(dx, dy);
      ctx.closePath();
      ctx.fill();
    };

    const draw = () => {
      // Clear with navy background
      ctx.fillStyle = "#0A192F";
      ctx.fillRect(0, 0, W, H);

      t += WAVE_SPEED;

      const pts = buildSpine(t, W, H);
      const normals = buildNormals(pts);
      const { tops, bots, twists } = buildEdges(pts, normals, t);

      // Shadow pass
      for (let i = 0; i < SEGMENTS; i++) {
        drawQuad(
          tops[i].x + SHADOW_OFFSET_X, tops[i].y + SHADOW_OFFSET_Y,
          tops[i + 1].x + SHADOW_OFFSET_X, tops[i + 1].y + SHADOW_OFFSET_Y,
          bots[i + 1].x + SHADOW_OFFSET_X, bots[i + 1].y + SHADOW_OFFSET_Y,
          bots[i].x + SHADOW_OFFSET_X, bots[i].y + SHADOW_OFFSET_Y,
          `rgba(${SHADOW_COLOR[0]},${SHADOW_COLOR[1]},${SHADOW_COLOR[2]},${SHADOW_ALPHA / 255})`
        );
      }

      // Ribbon pass
      for (let i = 0; i < SEGMENTS; i++) {
        const [r, g, b] = getRibbonColor(i / SEGMENTS, twists[i], t);
        drawQuad(
          tops[i].x, tops[i].y,
          tops[i + 1].x, tops[i + 1].y,
          bots[i + 1].x, bots[i + 1].y,
          bots[i].x, bots[i].y,
          `rgb(${r},${g},${b})`
        );

        // Edge lines
        if (Math.abs(twists[i]) > EDGE_MIN_TWIST) {
          ctx.strokeStyle = `rgba(${EDGE_COLOR[0]},${EDGE_COLOR[1]},${EDGE_COLOR[2]},${EDGE_ALPHA / 255})`;
          ctx.lineWidth = EDGE_WEIGHT;
          ctx.beginPath();
          ctx.moveTo(tops[i].x, tops[i].y);
          ctx.lineTo(tops[i + 1].x, tops[i + 1].y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(bots[i].x, bots[i].y);
          ctx.lineTo(bots[i + 1].x, bots[i + 1].y);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: "clamp(200px, 25dvh, 320px)" }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {/* Fade edges into surrounding sections */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20"
        style={{ background: "linear-gradient(180deg, #0A192F 0%, transparent 100%)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
        style={{ background: "linear-gradient(0deg, #0A192F 0%, transparent 100%)" }}
      />
    </div>
  );
}
