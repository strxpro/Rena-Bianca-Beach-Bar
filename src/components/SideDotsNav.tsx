"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import type { TranslationKeys } from "@/i18n/translations";

/* ═══════════════════════════════════════════════════════════════
   SIDE DOTS NAV — shy, collapsible rail on the right edge
   ─────────────────────────────────────────────────────────────
   • IDLE: the capsule is pushed halfway off the right edge so
     only the dots peek out — minimum visual noise while you
     read the page.
   • ON SECTION CHANGE: the capsule slides fully back into the
     viewport, grows to its normal size, and reveals the active
     section name in a pill next to its dot. After 2 seconds it
     automatically folds back to the shy idle state.
   • ON HOVER: slides fully out for as long as the cursor is
     over the rail, regardless of the timer.
   • The capsule's own SVG border doubles as a page-progress
     meter — a rounded-rect stroke drawn around the pill with
     `pathLength=1` + `strokeDashoffset` = 1 − pageProgress.
   • Clicking a dot smooth-scrolls via Lenis (SmoothScrollProvider)
     with a window.scrollTo fallback.
   ═══════════════════════════════════════════════════════════════ */

const SECTIONS: {
  id: string;
  key: Extract<
    keyof TranslationKeys,
    | "nav.home"
    | "nav.about"
    | "nav.menu"
    | "nav.testimonials"
    | "nav.panorama"
    | "nav.gallery"
    | "nav.contact"
  >;
}[] = [
  { id: "home", key: "nav.home" },
  { id: "about", key: "nav.about" },
  { id: "menu", key: "nav.menu" },
  { id: "testimonials", key: "nav.testimonials" },
  { id: "panorama", key: "nav.panorama" },
  { id: "gallery", key: "nav.gallery" },
  { id: "contact", key: "nav.contact" },
];

type LenisLike = {
  scrollTo: (
    target: string | number | Element,
    opts?: { duration?: number; offset?: number; easing?: (t: number) => number; immediate?: boolean }
  ) => void;
};

/* Auto-collapse duration: after arriving on a new section the
   rail is fully visible for this long, then shrinks back into
   its shy state. */
const REVEAL_HOLD_MS = 2000;

export default function SideDotsNav() {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  /* Real pixel dimensions of the pill. Drives the SVG progress
     border so its geometry tracks the wrapper's border-radius
     perfectly at every viewport size. */
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [progress, setProgress] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  /* Controls the "shy" collapsed state. True = fully visible
     (hover or recent section change); false = peeking from the
     right edge. */
  const [expanded, setExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  /* Tracks whether the user is currently scrolling. While true the
     progress border thickens; ~220 ms after the last scroll event
     it relaxes back to the subtle hairline. Gives the rail a
     gentle "alive when in motion, calm when idle" pulse. */
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  /* The freshly-clicked index stays "stuck" as active for a moment
     so the user sees their choice highlighted even before the
     section scrolls under the viewport mid-point. */
  const clickedIdxRef = useRef<{ idx: number; until: number } | null>(null);

  /* ── Measure the wrapper so the SVG progress rect is drawn
        in real pixels. We use `borderBoxSize` (with a
        contentRect fallback) so the dimensions include padding —
        exactly the box the wrapper's `border-radius: 9999px`
        rounds. ── */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const box = e.borderBoxSize?.[0];
        const w = box ? box.inlineSize : e.contentRect.width;
        const h = box ? box.blockSize : e.contentRect.height;
        setSize({ w, h });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Scroll listener → page progress + active section + scrolling state ── */
  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const docH = Math.max(
        1,
        (document.documentElement.scrollHeight || 0) - window.innerHeight
      );
      const p = Math.min(1, Math.max(0, scrollY / docH));
      setProgress(p);

      const vpMid = scrollY + window.innerHeight * 0.45;
      let current = 0;
      for (let i = 1; i < SECTIONS.length; i++) {
        const el = document.getElementById(SECTIONS[i].id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + scrollY;
        if (vpMid >= top) current = i;
      }

      const stuck = clickedIdxRef.current;
      if (stuck && performance.now() < stuck.until) {
        current = stuck.idx;
      } else {
        clickedIdxRef.current = null;
      }

      setActiveIdx(current);

      /* Pulse the border thicker while the user is actively
         moving, then relax back to a hairline once they settle. */
      setIsScrolling(true);
      if (scrollIdleTimerRef.current !== null) {
        window.clearTimeout(scrollIdleTimerRef.current);
      }
      scrollIdleTimerRef.current = window.setTimeout(() => {
        scrollIdleTimerRef.current = null;
        setIsScrolling(false);
      }, 220);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (scrollIdleTimerRef.current !== null) {
        window.clearTimeout(scrollIdleTimerRef.current);
      }
    };
  }, []);

  /* ── Auto-reveal on section change: grow fully, show label,
        fold back after REVEAL_HOLD_MS ── */
  useEffect(() => {
    setExpanded(true);
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      setExpanded(false);
    }, REVEAL_HOLD_MS);
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [activeIdx]);

  const go = useCallback((idx: number) => {
    const section = SECTIONS[idx];
    clickedIdxRef.current = { idx, until: performance.now() + 900 };
    setActiveIdx(idx);

    const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
    if (section.id === "home") {
      if (lenis) lenis.scrollTo(0, { duration: 1.4 });
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(section.id);
    if (!el) return;
    if (lenis) {
      lenis.scrollTo(el, { duration: 1.4, offset: -40 });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const isOut = expanded || isHovering;
  /* Stroke weight pulses with motion: hairline while idle (~1px),
     swelling to a fuller line while the user is actively scrolling
     or hovering. The progress meter therefore reads as "alive"
     during scroll and "calm" between movements. */
  const strokeW = isScrolling || isHovering ? 2.4 : 1;

  const w = size.w;
  const h = size.h;
  const sw = strokeW;
  /* Inset the SVG rect by half the stroke width so the OUTER
     edge of the stroke lands exactly on the wrapper's CSS
     border-radius silhouette. */
  const inset = sw / 2;
  const rectW = Math.max(0, w - sw);
  const rectH = Math.max(0, h - sw);
  /* Corner radius for the SVG rect.
     CSS `border-radius: 9999px` collapses to `min(w/2, h/2)` —
     for our pill that's `w/2` (the box is taller than wide),
     producing semicircular caps top and bottom. We must use
     the SAME value for both rx AND ry on the SVG rect,
     otherwise SVG clamps each independently:
       rx → min(9999, rectW/2) = rectW/2
       ry → min(9999, rectH/2) = rectH/2
     and the corners become tall ELLIPSES (the "crooked
     border" the user reported) instead of the half-circles
     the wrapper actually has. By giving rx and ry the same
     value, we force semicircular caps that exactly match the
     wrapper's silhouette. */
  const rectR = Math.max(0, Math.min(rectW, rectH) / 2);
  const showSvg = rectW > 0 && rectH > 0;

  return (
    <nav
      aria-label="Sections"
      /* Position is driven entirely by inline styles below so a
         Tailwind utility can never partially override the
         transform / top combo. We keep one class for the right
         offset breakpoint. */
      className="pointer-events-none sm:[--rail-right:16px]"
      style={{
        position: "fixed",
        /* `top: 50vh + translateY(-50%)` keeps the rail's
           VERTICAL CENTRE glued to the middle of the viewport
           on every page, every viewport size, every scroll
           position — including pages where some ancestor sets
           a transform that would otherwise break `top: 50%`. */
        top: "50vh",
        right: "var(--rail-right, 12px)",
        zIndex: 90,
        /* Subtle in/out nudge keeps the shy ↔ expanded
           transition feeling alive without ever leaving the
           right edge. The `-50%` keeps the rail vertically
           centred regardless of its current height. */
        transform: `translate(${isOut ? "0px" : "6px"}, -50%)`,
        transition: "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div
        ref={wrapRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="pointer-events-auto relative bg-navy/45 backdrop-blur-md"
        style={{
          /* Plain CSS border-radius — the browser clamps
             `9999px` to `min(w/2, h/2)` automatically, giving a
             perfect full-pill silhouette at any padding /
             content size. No clip-path tricks. */
          borderRadius: 9999,
          /* Padding scales with viewport height: comfy on
             desktop, tighter on short laptop screens / phones
             so the rail always fits inside the viewport (and
             therefore actually CAN be vertically centred). */
          padding: isOut
            ? "clamp(8px, 1.6vh, 16px) clamp(8px, 1.2vw, 12px)"
            : "clamp(6px, 1.0vh, 10px) clamp(6px, 0.8vw, 8px)",
          boxShadow:
            "-10px 10px 30px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          transition:
            "padding 520ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 520ms",
        }}
      >
        {/* ── PROGRESS BORDER ────────────────────────────────────
             A single SVG `<rect rx={9999}>` overlays the wrapper.
             Both the wrapper's CSS `border-radius` and the
             rect's `rx` are clamped to `min(w/2, h/2)` per
             spec, so the stroke always traces the wrapper's
             silhouette pixel-for-pixel. The rect is rebuilt
             every time the wrapper resizes (padding transition,
             viewport resize, font load) so the border can
             never get out of sync with the box. ── */}
        {showSvg && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              <linearGradient id="sideNavGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8ec5e8" />
                <stop offset="55%" stopColor="#3B82C4" />
                <stop offset="100%" stopColor="#2a6a9e" />
              </linearGradient>
            </defs>

            {/* Track — almost invisible hairline so the capsule
                doesn't read as "outlined" while idle. */}
            <rect
              x={inset}
              y={inset}
              width={rectW}
              height={rectH}
              rx={rectR}
              ry={rectR}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={sw}
              style={{ transition: "stroke-width 420ms cubic-bezier(0.22, 1, 0.36, 1)" }}
            />

            {/* Progress stroke — `pathLength={1}` normalises the
                rect's perimeter to 1, so `strokeDashoffset =
                1 - progress` reads as a percentage of the page
                regardless of the pill's actual size. */}
            <rect
              x={inset}
              y={inset}
              width={rectW}
              height={rectH}
              rx={rectR}
              ry={rectR}
              fill="none"
              stroke="url(#sideNavGrad)"
              strokeWidth={sw}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - progress}
              style={{
                transition:
                  "stroke-dashoffset 280ms cubic-bezier(0.22, 0.61, 0.36, 1), stroke-width 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                filter:
                  "drop-shadow(0 0 4px rgba(142, 197, 232, 0.35))",
              }}
            />
          </svg>
        )}

        {/* ── DOTS COLUMN ──────────────────────────────────────
             Gap also scales with viewport height so 7 dots +
             6 gaps + padding never exceed the viewport on
             shorter laptops / phones. ── */}
        <ul
          className="relative flex flex-col items-center"
          style={{
            gap: isOut
              ? "clamp(8px, 1.8vh, 18px)"
              : "clamp(6px, 1.2vh, 12px)",
            transition: "gap 520ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {SECTIONS.map((section, i) => {
            const isActive = i === activeIdx;
            const isHovered = hoverIdx === i;
            /* Label is only shown for the active dot (and only
               while the rail is in its expanded state) or while
               hovering a specific dot. This matches the brief:
               "when on a section, show the section name, then
               after ~2s it gently fades away with the rest of
               the rail". */
            const showLabel = isHovered || (isActive && isOut);
            return (
              <li
                key={section.id}
                className="relative flex items-center"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {/* Floating label (to the LEFT of the dot) */}
                <span
                  aria-hidden={!showLabel}
                  className={`pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-navy/85 px-3 py-1 font-body text-[10px] font-medium uppercase tracking-[0.2em] backdrop-blur-md transition-all duration-300 sm:text-[11px]
                    ${showLabel
                      ? "translate-x-0 opacity-100 text-sand"
                      : "translate-x-2 opacity-0"}`}
                  style={{
                    boxShadow:
                      "0 8px 24px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  {t(section.key)}
                </span>

                <button
                  type="button"
                  aria-label={t(section.key)}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => go(i)}
                  className="group/dot relative flex h-5 w-5 items-center justify-center focus:outline-none"
                >
                  {/* Outer halo — only when active */}
                  <span
                    aria-hidden
                    className={`absolute rounded-full transition-all duration-300
                      ${isActive
                        ? "h-5 w-5 bg-ocean/20 ring-1 ring-ocean/40"
                        : "h-3 w-3 bg-transparent"}`}
                  />
                  {/* Inner dot */}
                  <span
                    aria-hidden
                    className={`relative block rounded-full transition-all duration-300
                      ${isActive
                        ? "h-2 w-2 bg-sand shadow-[0_0_12px_rgba(142,197,232,0.9)]"
                        : "h-1.5 w-1.5 bg-sand/35 group-hover/dot:h-2 group-hover/dot:w-2 group-hover/dot:bg-sand/70"}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
