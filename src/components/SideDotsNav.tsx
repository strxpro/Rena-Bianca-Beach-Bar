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
  /* Hidden on mount — the rail only appears AFTER the hero video
     ends. Per the brief, the dotted nav must be invisible while
     the intro film is playing; it fades in the moment HeroSection
     fires `video-ended`. `preloader-complete` is a redundant
     second channel so a reload-past-hero path still shows the
     rail immediately. */
  const [filmDone, setFilmDone] = useState(false);
  useEffect(() => {
    const show = () => setFilmDone(true);
    window.addEventListener("video-ended", show, { once: true });
    window.addEventListener("preloader-complete", show, { once: true });
    /* If the page was reloaded while scrolled past the hero, the
       rail should be visible immediately — the film never plays. */
    if (typeof window !== "undefined" && window.scrollY > 100) {
      setFilmDone(true);
    }
    return () => {
      window.removeEventListener("video-ended", show);
      window.removeEventListener("preloader-complete", show);
    };
  }, []);
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
      const rawP = Math.min(1, Math.max(0, scrollY / docH));

      const vpMid = scrollY + window.innerHeight * 0.45;
      let current = 0;
      /* Gather each section's anchor-top while we're already
         traversing the list so we can build a section-weighted
         progress meter in a single pass. */
      const sectionTops: number[] = new Array(SECTIONS.length).fill(0);
      for (let i = 1; i < SECTIONS.length; i++) {
        const el = document.getElementById(SECTIONS[i].id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + scrollY;
        sectionTops[i] = top;
        if (vpMid >= top) current = i;
      }

      const stuck = clickedIdxRef.current;
      if (stuck && performance.now() < stuck.until) {
        current = stuck.idx;
      } else {
        clickedIdxRef.current = null;
      }

      /* ── Section-weighted progress ─────────────────────────────
         The bar no longer tracks raw pixel scroll. Instead each
         section gets an equal slice (1 / (N-1)) of the bar, and
         within a section the bar fills proportionally to how far
         between that section's anchor and the next one we've
         scrolled. This keeps the pace consistent whether a
         section is 100 vh or 600 vh tall — exactly what the user
         asked for ("same timing as it reaches each next section").

         Then, the moment the LAST section becomes active, the
         remaining progress is accelerated with a sharp ease so the
         bar closes quickly instead of waiting for the user to
         scroll to the very bottom of the contact/footer block. */
      const last = SECTIONS.length - 1;
      const perSection = 1 / last;
      let sectionalP: number;
      if (current >= last) {
        // Accelerate to 100 % across the last section's visible window
        const lastTop = sectionTops[last] || 0;
        const windowH = Math.max(1, window.innerHeight * 0.6);
        const within = Math.min(1, Math.max(0, (scrollY + window.innerHeight - lastTop) / windowH));
        // Ease-out so the final stretch snaps closed rather than
        // creeping
        const eased = 1 - Math.pow(1 - within, 2);
        sectionalP = (last - 1) * perSection + perSection + (1 - (last - 1) * perSection - perSection) * eased;
        sectionalP = Math.min(1, Math.max(current * perSection, sectionalP));
      } else {
        const curTop = sectionTops[current] || 0;
        const nextTop = sectionTops[current + 1] || curTop + window.innerHeight;
        const span = Math.max(1, nextTop - curTop);
        const within = Math.min(1, Math.max(0, (vpMid - curTop) / span));
        sectionalP = current * perSection + within * perSection;
      }

      /* Clamp & never go backwards from what pixel-scroll already
         legitimately achieved — prevents the bar from snapping back
         when a tall pinned section reports a smaller sectional
         value than raw scroll on unpin. */
      const p = Math.min(1, Math.max(sectionalP, rawP * 0.95));
      setProgress(p);

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
  /* Special exception requested for the menu section only: when the
     interactive book menu owns the viewport the rail must hide
     halfway off the right edge so it never overlaps the page-flip
     hotspots. The instant the user scrolls into a different section
     the rail returns to its normal shy-but-visible state. */
  const isInMenu = SECTIONS[activeIdx]?.id === "menu";
  const hideForMenu = isInMenu && !isOut;
  /* Stroke weight pulses with motion: a soft "always-on" border
     while idle so the capsule never looks outline-less, swelling
     to a fuller line while the user is actively scrolling or
     hovering. The progress meter therefore reads as a proper
     capsule border at all times — subtle when calm, alive when
     in motion. */
  const strokeW = isScrolling || isHovering ? 2.4 : 1.6;

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
        right: "var(--rail-right, 6px)",
        zIndex: 90,
        /* Subtle in/out nudge keeps the shy ↔ expanded
           transition feeling alive without ever leaving the
           right edge. The `-50%` keeps the rail vertically
           centred regardless of its current height. While the
           user is on the MENU section the rail tucks half of its
           own width off the right edge so the page-flip hotspots
           are unobstructed; everywhere else the regular shy/out
           offsets apply.
           Until the intro film ends the whole rail is fully
           hidden (opacity 0 + translated off-screen to the right)
           — the brief explicitly asks for "hide the dotted menu
           while the film is playing". */
        transform: `translate(${
          !filmDone ? "120%" : hideForMenu ? "55%" : isOut ? "0px" : "6px"
        }, -50%)`,
        transition:
          "transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 420ms ease-out",
        opacity: !filmDone ? 0 : hideForMenu ? 0.55 : 1,
        pointerEvents: !filmDone ? "none" : undefined,
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
             therefore actually CAN be vertically centred).
             The mobile floor (`5px`/`4px`) was explicitly tuned
             down from 8/6 so the rail is physically small on
             phones — the user asked for a smaller dotted menu
             on mobile. */
          padding: isOut
            ? "clamp(5px, 1.4vh, 16px) clamp(4px, 1.0vw, 12px)"
            : "clamp(4px, 0.8vh, 10px) clamp(3px, 0.6vw, 8px)",
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
            /* `preserveAspectRatio="none"` forces the SVG viewport
               to match the wrapper's exact pixel dimensions even
               during the padding transition — without it, `meet`
               can letterbox the viewBox by a hair and the stroke
               reads as slightly inset from the capsule silhouette.
               With `none`, the border always traces the CSS
               `border-radius: 9999` pill pixel-for-pixel. */
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${w} ${h}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="sideNavGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8ec5e8" />
                <stop offset="55%" stopColor="#3B82C4" />
                <stop offset="100%" stopColor="#2a6a9e" />
              </linearGradient>
            </defs>

            {/* Track — the capsule's always-on border. Subtle
                enough to feel delicate, strong enough that the
                pill silhouette always reads as "outlined", so the
                progress stroke above it acts as a highlight
                filling in a visible border rather than drawing a
                border from scratch. */}
            <rect
              x={inset}
              y={inset}
              width={rectW}
              height={rectH}
              rx={rectR}
              ry={rectR}
              fill="none"
              stroke="rgba(253, 251, 247, 0.22)"
              strokeWidth={sw}
              style={{ transition: "stroke-width 420ms cubic-bezier(0.22, 1, 0.36, 1), stroke 420ms" }}
            />

            {/* Progress stroke — `pathLength={1}` normalises the
                rect's perimeter to 1, so `strokeDashoffset =
                1 - progress` reads as a percentage of the page
                regardless of the pill's actual size.

                IMPORTANT: `stroke-dashoffset` is NOT transitioned.
                The scroll handler already fires on every frame and
                React snaps `progress` to the current scroll ratio,
                so a CSS transition on top of that would add a
                280 ms "chase" and make the bar feel like it
                animates in AFTER the scroll has already stopped.
                By letting the dashoffset update instantly we
                piggy-back on Lenis' own smoothing and get a bar
                that scrubs in lockstep with the scroll position.
                Only `stroke-width` keeps its easing, because that
                one IS meant to ease (idle ↔ scrolling pulse). */}
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
                transition: "stroke-width 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                filter: "drop-shadow(0 0 4px rgba(142, 197, 232, 0.35))",
              }}
            />
          </svg>
        )}

        {/* ── DOTS COLUMN ──────────────────────────────────────
             Gap also scales with viewport height so 7 dots +
             6 gaps + padding never exceed the viewport on
             shorter laptops / phones. Mobile floor reduced from
             8/6 → 5/4 to further shrink the rail on phones. ── */}
        <ul
          className="relative flex flex-col items-center"
          style={{
            gap: isOut
              ? "clamp(5px, 1.6vh, 18px)"
              : "clamp(4px, 1.0vh, 12px)",
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
                  /* Touch target stays 20×20 on desktop (h-5 w-5)
                     but drops to 14×14 on phones (h-3.5 w-3.5) so
                     the rail shrinks visually AND the 7-dot column
                     never eats more than ~120 px of vertical
                     viewport on small screens. */
                  className="group/dot relative flex h-3.5 w-3.5 items-center justify-center focus:outline-none sm:h-5 sm:w-5"
                >
                  {/* Outer halo — only when active */}
                  <span
                    aria-hidden
                    className={`absolute rounded-full transition-all duration-300
                      ${isActive
                        ? "h-3.5 w-3.5 bg-ocean/20 ring-1 ring-ocean/40 sm:h-5 sm:w-5"
                        : "h-2 w-2 bg-transparent sm:h-3 sm:w-3"}`}
                  />
                  {/* Inner dot */}
                  <span
                    aria-hidden
                    className={`relative block rounded-full transition-all duration-300
                      ${isActive
                        ? "h-1.5 w-1.5 bg-sand shadow-[0_0_10px_rgba(142,197,232,0.85)] sm:h-2 sm:w-2"
                        : "h-1 w-1 bg-sand/35 group-hover/dot:h-1.5 group-hover/dot:w-1.5 group-hover/dot:bg-sand/70 sm:h-1.5 sm:w-1.5"}`}
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
