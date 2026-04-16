"use client";

import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

/* ═══════════════════════════════════════════════════════════════
   VIDEO INSIDE OVERLAY — same stacking context, guaranteed hole
   ─────────────────────────────────────────────────────────────
   overlay (z-50)
   ├── VIDEO      z-0  absolute inset-0  (plays immediately)
   ├── overlayBg  z-1  bg-sand           (MASKED → hole)
   ├── wavesWrap  z-2  waves             (MASKED → hole)
   └── content    z-10 flower+text       (flower center transparent)

   Mask on overlayBg + wavesWrap creates a growing circle of
   transparency. The video at z-0 is revealed through the hole.

   A SECOND full-screen video at z-10 (outside overlay) takes
   over when overlay hides. Both play from mount → stay in sync.
   ═══════════════════════════════════════════════════════════════ */

const WAVE_DURS = [1.2, 0.9, 0.6];
const WAVE_DELAYS = [0, 0.35, 0.6];
const LETTER_DUR = 0.55;
const LETTER_STAGGER = 0.025;
const EXPAND_DUR = 0.5;
const SUB_DUR = 0.35;
const SUB_STAGGER = 0.03;
const REVEAL_DUR = 0.45;
const ZOOM_DUR = 1.2;
const ZOOM_SCALE_DESKTOP = 200;
const ZOOM_SCALE_MOBILE = 120;
const VIDEO_FADE_DUR = 2.5;
const VIDEO_SRC = "/film2.mp4";

const COLOR_NAVY = "#0A192F";
const COLOR_SAND = "#FDFBF7";

const WAVES = [
  { color: "#7CB9E8", path: "M0 45 Q180 5 360 45 Q540 85 720 45 Q900 5 1080 45 Q1260 85 1440 45 L1440 100 L0 100Z" },
  { color: "#3B82C4", path: "M0 35 Q240 75 480 35 Q720 -5 960 35 Q1200 75 1440 35 L1440 100 L0 100Z" },
  { color: COLOR_NAVY, path: "M0 55 Q180 25 360 50 Q540 75 720 40 Q900 5 1080 50 Q1260 70 1440 45 L1440 100 L0 100Z" },
];

const SUBTITLE = ["B", "E", "A", "C", "H", "\u00A0", "B", "A", "R"];

function setHoleMask(el: HTMLElement, r: number, cx = "50%", cy = "50%") {
  if (r <= 0) {
    el.style.removeProperty("mask-image");
    el.style.removeProperty("-webkit-mask-image");
    return;
  }
  const g = `radial-gradient(circle ${r}px at ${cx} ${cy}, transparent 0px, transparent ${r}px, black ${r}px)`;
  el.style.setProperty("mask-image", g);
  el.style.setProperty("-webkit-mask-image", g);
}

function firePreloaderComplete() {
  window.dispatchEvent(new CustomEvent("preloader-complete"));
}

export default function HeroSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const fullVideoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnded = useCallback(() => {
    const vid = fullVideoRef.current;
    if (!vid) return;
    gsap.to(vid, {
      opacity: 0,
      duration: VIDEO_FADE_DUR,
      ease: "power2.inOut",
      onComplete: () => {
        vid.style.display = "none";
        window.dispatchEvent(new CustomEvent("video-ended"));
        firePreloaderComplete();
      },
    });
  }, []);

  const skippedRef = useRef(false);

  useEffect(() => {
    const vid = fullVideoRef.current;
    const root = rootRef.current;
    if (!vid) return;

    // If user reloaded while scrolled past hero, skip everything
    if (window.scrollY > 100) {
      skippedRef.current = true;
      vid.style.display = "none";
      document.documentElement.style.overflow = "";
      const overlay = root?.querySelector("[data-overlay]") as HTMLElement | null;
      if (overlay) overlay.style.display = "none";
      window.dispatchEvent(new CustomEvent("header-show"));
      window.dispatchEvent(new CustomEvent("video-ended"));
      firePreloaderComplete();
      return;
    }

    const peek = root?.querySelector("[data-peek-video]") as HTMLVideoElement | null;
    const playBoth = () => {
      vid.play().catch(() => {});
      peek?.play().catch(() => {});
    };
    // Play immediately
    playBoth();
    const retry = setTimeout(playBoth, 800);
    const fallback = setTimeout(() => {
      if (vid.style.display !== "none") {
        vid.style.display = "none";
        window.dispatchEvent(new CustomEvent("video-ended"));
        firePreloaderComplete();
      }
    }, 8000);

    // Safety: if preloader animation stalls, force-unlock page
    const safetyUnlock = setTimeout(() => {
      document.documentElement.style.overflow = "";
      const overlay = root?.querySelector("[data-overlay]") as HTMLElement | null;
      if (overlay && overlay.style.display !== "none") {
        overlay.style.display = "none";
        window.dispatchEvent(new CustomEvent("header-show"));
        window.dispatchEvent(new CustomEvent("video-ended"));
        firePreloaderComplete();
      }
    }, 6000);
    return () => {
      clearTimeout(retry);
      clearTimeout(fallback);
      clearTimeout(safetyUnlock);
    };
  }, []);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      // Skip preloader animation if page loaded scrolled down
      if (skippedRef.current) return;
      document.documentElement.style.overflow = "hidden";

      const heading = root.querySelector("[data-heading]") as HTMLElement;
      const letters = root.querySelectorAll("[data-letter]");
      const subLetters = root.querySelectorAll("[data-sub-letter]");
      const box = root.querySelector("[data-box]");
      const flower = root.querySelector("[data-flower]");
      const yellow = root.querySelector("[data-yellow]") as HTMLElement;
      const start = root.querySelector("[data-start]");
      const end = root.querySelector("[data-end]");
      const overlay = root.querySelector("[data-overlay]") as HTMLElement;
      const overlayBg = root.querySelector("[data-overlay-bg]") as HTMLElement;
      const wavesWrap = root.querySelector("[data-waves]") as HTMLElement;
      const waves = root.querySelectorAll("[data-wave]");
      const zoomTarget = root.querySelector("[data-zoom-target]") as HTMLElement;

      if (!heading || !box || !flower || !yellow || !start || !end || !overlay || !overlayBg || !wavesWrap || !zoomTarget) return;

      const emPx = parseFloat(getComputedStyle(heading).fontSize);
      const baseHoleRadius = emPx * 0.175;
      const yellowRadius = emPx * 0.175;

      const isMobile = window.innerWidth < 768;
      const zoomScale = isMobile ? ZOOM_SCALE_MOBILE : ZOOM_SCALE_DESKTOP;

      gsap.set(waves, { yPercent: 100 });
      gsap.set(zoomTarget, { color: COLOR_NAVY });

      const hole = { r: 0 };
      const yellowHole = { r: 0 };
      let holeCX = "50%";
      let holeCY = "50%";

      const applyMasks = () => {
        setHoleMask(overlayBg, hole.r, holeCX, holeCY);
        setHoleMask(wavesWrap, hole.r, holeCX, holeCY);
        setHoleMask(yellow, yellowHole.r);
      };

      const tl = gsap.timeline({ defaults: { ease: "expo.inOut" } });

      waves.forEach((w, i) => {
        tl.to(w, { yPercent: 0, duration: WAVE_DURS[i] ?? 0.6, ease: "power2.inOut" }, WAVE_DELAYS[i] ?? 0);
      });
      tl.from(letters, { yPercent: 110, stagger: LETTER_STAGGER, duration: LETTER_DUR }, 0);
      tl.to(zoomTarget, { color: COLOR_SAND, duration: 0.35, ease: "power1.inOut" }, 0.6);

      const fStart = LETTER_DUR * 0.65;
      tl.fromTo(box, { width: "0em" }, { width: "1.2em", duration: EXPAND_DUR }, fStart);
      tl.fromTo(flower, { width: "0%" }, { width: "100%", duration: EXPAND_DUR }, "<");
      tl.fromTo(start, { x: "0em" }, { x: "-0.06em", duration: EXPAND_DUR }, "<");
      tl.fromTo(end, { x: "0em" }, { x: "0.06em", duration: EXPAND_DUR }, "<");

      tl.from(subLetters, { yPercent: 110, opacity: 0, stagger: SUB_STAGGER, duration: SUB_DUR, ease: "expo.out" }, `<+${EXPAND_DUR * 0.3}`);

      /* ── Compute exact center of yellow circle for pixel-perfect alignment ── */
      tl.call(() => {
        const rect = yellow.getBoundingClientRect();
        const targetRect = zoomTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        holeCX = `${cx}px`;
        holeCY = `${cy}px`;
        // Align zoom transform origin to the yellow circle center so the
        // "O" expands radially from its rim — user flies THROUGH the edge.
        const ox = ((cx - targetRect.left) / targetRect.width) * 100;
        const oy = ((cy - targetRect.top) / targetRect.height) * 100;
        zoomTarget.style.transformOrigin = `${ox}% ${oy}%`;
      });

      /* ── Yellow circle becomes "holey" — mask grows inside yellow, revealing video ── */
      tl.to(yellowHole, {
        r: yellowRadius,
        duration: 0.8,
        ease: "power2.out",
        onUpdate: applyMasks,
      }, ">+0.3");

      /* ── Open hole in overlay bg + waves (same time) ── */
      tl.to(hole, {
        r: baseHoleRadius,
        duration: REVEAL_DUR,
        ease: "power2.out",
        onUpdate: applyMasks,
      }, "<+0.2");

      /* ── Header starts fading in NOW (during zoom / before video) ── */
      tl.call(() => {
        window.dispatchEvent(new CustomEvent("header-show"));
      });

      /* ── ZOOM: the user literally flies through the rim of the "O".
            Three things happen synchronously:
            1. The whole zoomTarget scales up around the yellow-circle center.
            2. The masks (yellow hole + overlay hole) grow with an EXTRA
               multiplier so the hole outruns the visual circle → the edge
               of the "O" appears to widen into the full screen.
            3. Yellow + flower-petals + letters fade to opacity:0 so the
               "O" (and surrounding text) visually dissolve — leaving just
               the video behind in plain sight. ── */
      // Mask boost: grows ~30% faster than the pure scale so the
      // transparent area (= inside of the O) reaches the viewport edges
      // before the visual scale does. This IS the "edge of O opens up".
      const HOLE_BOOST = 1.35;
      tl.to(zoomTarget, {
        scale: zoomScale,
        duration: ZOOM_DUR,
        ease: "power4.inOut",
        onUpdate: () => {
          const s = gsap.getProperty(zoomTarget, "scaleX") as number;
          hole.r = baseHoleRadius * s * HOLE_BOOST;
          yellowHole.r = yellowRadius * s * HOLE_BOOST;
          applyMasks();
        },
      }, ">+0.1");

      // "O" dissolves — flower petals + yellow fill fade to transparent
      // while zooming. Starts early (alongside the zoom) and finishes
      // just past half the zoom, so by the time we're at full scale the
      // ring of the O is a clean hole onto the video.
      tl.to([flower, yellow], {
        opacity: 0,
        duration: ZOOM_DUR * 0.55,
        ease: "power2.in",
      }, `<+${ZOOM_DUR * 0.05}`);

      // RENA / BIANCA gently fade while they fly off-screen so the reveal
      // doesn't end with harsh letters snapping away — everything
      // dissolves into the video space in the same breath as the "O".
      tl.to([start, end], {
        opacity: 0,
        duration: ZOOM_DUR * 0.6,
        ease: "power2.in",
      }, "<");

      tl.set(overlay, { display: "none" });
      tl.call(() => {
        document.documentElement.style.overflow = "";
      });
    },
    { scope: rootRef }
  );

  const leftLetters = ["R", "E", "N", "A"];
  const rightLetters = ["B", "I", "A", "N", "C", "A"];

  return (
    <div ref={rootRef}>
      {/* ═══ z-10 Full video — takes over after overlay hides, fades on end ═══ */}
      <video
        ref={fullVideoRef}
        className="pointer-events-none fixed inset-0 z-10 h-full w-full object-cover"
        muted playsInline preload="auto"
        src={VIDEO_SRC}
        onEnded={handleVideoEnded}
      />

      {/* ═══ z-50 Preloader overlay ═══ */}
      <div data-overlay className="fixed inset-0 z-50 overflow-hidden">

        {/* z-0 — Video INSIDE overlay (same stacking context) */}
        <video
          data-peek-video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ zIndex: 0 }}
          muted playsInline preload="auto"
          src={VIDEO_SRC}
        />

        {/* z-1 — Solid bg (MASKED → hole reveals video at z-0) */}
        <div data-overlay-bg className="absolute inset-0 bg-sand" style={{ zIndex: 1 }} />

        {/* z-2 — Waves (MASKED → hole reveals video at z-0) */}
        <div data-waves className="absolute inset-0" style={{ zIndex: 2 }}>
          {WAVES.map((w, i) => (
            <div key={i} data-wave className="absolute inset-0" style={{ backgroundColor: w.color, zIndex: i + 1 }}>
              <svg className="absolute left-0 w-full" style={{ bottom: "100%", height: 80 }} viewBox="0 0 1440 100" preserveAspectRatio="none">
                <path d={w.path} style={{ fill: w.color }} />
              </svg>
            </div>
          ))}
        </div>

        {/* z-10 — Content (flower has transparent centre, yellow gets mask).
             Safety padding on the content stage so text/flower never touch
             the viewport edges on any device. */}
        <div
          className="relative flex h-full w-full items-center justify-center px-3 sm:px-6 md:px-8"
          style={{ zIndex: 10 }}
        >
          <div data-zoom-target className="flex w-full max-w-full flex-col items-center">
            <div
              data-heading
              className="flex w-full items-center justify-center whitespace-nowrap font-heading"
              style={{
                // Responsive font-size that fits ANY device:
                //   • width cap  : 10.5vw → scales with horizontal space.
                //   • height cap : 16vh   → won't be too tall on landscape.
                //   • min        : 1.25rem = 20px (readable on 280px folds).
                //   • max        : 11rem  = 176px (keeps 4K screens sharp).
                // `min(...)` picks whichever dimension is tighter, so the
                // whole "RENA [flower] BIANCA" row always fits horizontally
                // AND doesn't overrun short landscape screens.
                fontSize: "clamp(1.25rem, min(10.5vw, 16vh), 11rem)",
                fontWeight: 500,
                lineHeight: 0.85,
              }}
            >
              <div data-start className="flex flex-1 justify-end">
                {leftLetters.map((l, i) => (
                  <span key={`l-${i}`} className="inline-block overflow-hidden">
                    <span data-letter className="inline-block">{l}</span>
                  </span>
                ))}
              </div>

              <div data-box className="relative flex shrink-0 items-center justify-center" style={{ width: 0 }}>
                <div className="relative flex items-center justify-center" style={{ minWidth: "1em", height: "1em" }}>
                  <div data-flower className="absolute flex items-center justify-center overflow-hidden" style={{ width: "0%", height: "100%" }}>
                    <div className="relative flex items-center justify-center" style={{ minWidth: "1em", width: "100%", height: "100%" }}>
                      {/* Yellow circle — masked to create hole */}
                      <div
                        data-yellow
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFD12D]"
                        style={{ width: "35%", height: "35%", zIndex: 1 }}
                      />
                      {/* Flower SVG — transparent centre */}
                      <img
                        src="/flower-logo-hollow.svg"
                        alt=""
                        draggable={false}
                        className="relative h-full w-full object-contain"
                        style={{ zIndex: 2 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div data-end className="flex flex-1 justify-start">
                {rightLetters.map((l, i) => (
                  <span key={`r-${i}`} className="inline-block overflow-hidden">
                    <span data-letter className="inline-block">{l}</span>
                  </span>
                ))}
              </div>
            </div>

            <div
              className="mt-2 flex flex-wrap justify-center font-body uppercase opacity-70"
              style={{
                // Same min/vw/vh strategy as the heading so BEACH BAR
                // stays proportional and readable on any device.
                fontSize: "clamp(0.6rem, min(2.2vw, 3vh), 1.25rem)",
                letterSpacing: "0.3em",
              }}
            >
              {SUBTITLE.map((c, i) => (
                <span key={`s-${i}`} className="inline-block overflow-hidden">
                  <span data-sub-letter className="inline-block">{c}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
