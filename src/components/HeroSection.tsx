"use client";

import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/* ═══════════════════════════════════════════════════════════════
   VIDEO INSIDE OVERLAY — same stacking context, guaranteed hole
   ─────────────────────────────────────────────────────────────
   overlay (z-50)
   ├── VIDEO      z-0  absolute inset-0  (plays immediately)
   ├── overlayBg  z-1  bg-sand           (MASKED → hole)
   ├── wavesWrap  z-2  waves             (MASKED → hole)
   └── content    z-10 flower+text       (flower center transparent)
   ═══════════════════════════════════════════════════════════════ */

const LETTER_DUR = 1.4;
const LETTER_STAGGER = 0.045;
const WAVE_TRANSITION_DUR = 1.4;
const WAVE_STAGGER = 0.12;
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

function setHoleMaskVars(el: HTMLElement, r: number, cx = "50%", cy = "50%") {
  el.style.setProperty("--hole-r", `${r}px`);
  el.style.setProperty("--hole-cx", cx);
  el.style.setProperty("--hole-cy", cy);
}

function firePreloaderComplete() {
  window.__renaPreloaderComplete = true;
  document.documentElement.dataset.preloaderComplete = "true";
  window.dispatchEvent(new CustomEvent("preloader-complete"));
}

export default function HeroSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const fullVideoRef = useRef<HTMLVideoElement>(null);
  const introFinishedRef = useRef(false);
  const videoDismissedRef = useRef(false);

  const completeIntro = useCallback((options?: {
    fadeVideo?: boolean;
    hideVideo?: boolean;
    hideOverlay?: boolean;
    revealHeader?: boolean;
  }) => {
    const vid = fullVideoRef.current;
    const root = rootRef.current;
    const overlay = root?.querySelector("[data-overlay]") as HTMLElement | null;

    if (!introFinishedRef.current) {
      introFinishedRef.current = true;

      if (options?.revealHeader) {
        window.dispatchEvent(new CustomEvent("header-show"));
      }

      window.dispatchEvent(new CustomEvent("video-ended"));
      firePreloaderComplete();
    }

    if (options?.hideOverlay && overlay) {
      overlay.style.display = "none";
    }

    if (!vid || videoDismissedRef.current) return;

    if (options?.hideVideo) {
      videoDismissedRef.current = true;
      gsap.killTweensOf(vid);
      vid.pause();
      vid.style.display = "none";
      return;
    }

    if (options?.fadeVideo) {
      videoDismissedRef.current = true;
      gsap.killTweensOf(vid);
      gsap.to(vid, {
        opacity: 0,
        duration: VIDEO_FADE_DUR,
        ease: "power2.inOut",
        onComplete: () => {
          vid.pause();
          vid.style.display = "none";
        },
      });
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    completeIntro({ fadeVideo: true });
  }, [completeIntro]);

  const skippedRef = useRef(false);

  useEffect(() => {
    const vid = fullVideoRef.current;
    const root = rootRef.current;
    if (!vid) return;

    const revealVideo = () => {
      if (videoDismissedRef.current) return;
      gsap.killTweensOf(vid);
      gsap.to(vid, { opacity: 1, duration: 0.2, ease: "power1.out", overwrite: true });
    };

    if (window.scrollY > 100) {
      skippedRef.current = true;
      document.documentElement.classList.remove("intro-locked");
      document.body.classList.remove("intro-locked");
      completeIntro({ hideVideo: true, hideOverlay: true, revealHeader: true });
      return;
    }

    // Lock scroll on mount
    document.documentElement.classList.add("intro-locked");
    document.body.classList.add("intro-locked");

    const peek = root?.querySelector("[data-peek-video]") as HTMLVideoElement | null;
    const isMobileDevice = window.innerWidth < 768;
    if (peek) {
      if (isMobileDevice) {
        peek.pause();
        peek.removeAttribute("src");
        peek.load();
        peek.style.display = "none";
      } else {
        peek.src = VIDEO_SRC;
        peek.load();
        peek.style.display = "";
      }
    }

    const playVideo = () => {
      if (introFinishedRef.current) return;
      vid.play().catch(() => {});
      if (!isMobileDevice && peek?.src) {
        peek.play().catch(() => {});
      }
    };

    vid.addEventListener("loadeddata", revealVideo);
    vid.addEventListener("canplay", revealVideo);
    vid.addEventListener("playing", revealVideo);

    playVideo();
    if (vid.readyState >= 2) {
      requestAnimationFrame(revealVideo);
    }
    const retry = setTimeout(playVideo, 800);
    const fallback = setTimeout(() => {
      if (!introFinishedRef.current) {
        completeIntro({ hideVideo: true, hideOverlay: true, revealHeader: true });
      }
    }, 8000);

    const safetyUnlock = setTimeout(() => {
      const overlay = root?.querySelector("[data-overlay]") as HTMLElement | null;
      if (!introFinishedRef.current && overlay && overlay.style.display !== "none") {
        completeIntro({ hideOverlay: true, revealHeader: true });
      }
    }, 6000);
    return () => {
      clearTimeout(retry);
      clearTimeout(fallback);
      clearTimeout(safetyUnlock);
      vid.removeEventListener("loadeddata", revealVideo);
      vid.removeEventListener("canplay", revealVideo);
      vid.removeEventListener("playing", revealVideo);
    };
  }, [completeIntro]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (skippedRef.current) return;

      const letters = root.querySelectorAll("[data-letter]");
      const subLetters = root.querySelectorAll("[data-sub-letter]");
      const box = root.querySelector("[data-box]");
      const flower = root.querySelector("[data-flower]");
      const yellow = root.querySelector("[data-yellow]") as HTMLElement;
      const start = root.querySelector("[data-start]");
      const end = root.querySelector("[data-end]");
      const heading = root.querySelector("[data-heading]") as HTMLElement;
      const overlay = root.querySelector("[data-overlay]") as HTMLElement;
      const maskGroup = root.querySelector("[data-mask-group]") as HTMLElement;
      const waves = root.querySelectorAll("[data-wave]");
      const zoomTarget = root.querySelector("[data-zoom-target]") as HTMLElement;

      if (!heading || !box || !flower || !yellow || !start || !end || !overlay || !maskGroup || !zoomTarget) return;

      const emPx = parseFloat(getComputedStyle(heading).fontSize);
      const baseHoleRadius = emPx * 0.175;
      const yellowRadius = emPx * 0.175;

      const peekVideo = root.querySelector("[data-peek-video]") as HTMLVideoElement | null;

      const isMobile = window.innerWidth < 768;
      const zoomScale = isMobile ? ZOOM_SCALE_MOBILE : ZOOM_SCALE_DESKTOP;

      // ── CACHE PREV VALUES ──
      let lastHoleR = -1;
      let lastYellowR = -1;

      const applyMasks = (hr: number, yr: number) => {
        if (hr === lastHoleR && yr === lastYellowR) return;
        setHoleMaskVars(maskGroup, hr, holeCX, holeCY);
        setHoleMaskVars(yellow, yr);
        lastHoleR = hr;
        lastYellowR = yr;
      };

      // ── INITIAL STATE (No CSS conflicts, all GSAP) ──
      const hole = { r: 0 };
      const yellowHole = { r: 0 };
      let holeCX = "50%";
      let holeCY = "50%";

      // gsps.set is no longer needed for letters as they start from 110% via inline styles
      gsap.set(zoomTarget, { color: COLOR_NAVY, scale: 1, x: 0, y: 0, force3D: true });
      gsap.set([start, end, box, flower], { x: 0, width: 0, opacity: 1, force3D: true });
      gsap.set(waves, { y: "150%", force3D: true });
      gsap.set(subLetters, { y: "150%", opacity: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "expo.inOut", force3D: true }
      });

      /* ── PHASE 1: Entrance ── */
      tl.fromTo(letters, 
        { y: "110%" },
        {
          y: "0%",
          stagger: LETTER_STAGGER,
          duration: LETTER_DUR,
          ease: "power3.out",
          force3D: true, // FIX: ensure GPU compositing for letter animations
        }, 
        0
      );

      /* ── PHASE 2: Wave Rise ── */
      const transitionStart = LETTER_DUR - 0.25;

      tl.to(waves, {
        y: "0%",
        stagger: WAVE_STAGGER,
        duration: WAVE_TRANSITION_DUR,
      }, transitionStart);

      tl.to(box, { width: "1.2em", duration: WAVE_TRANSITION_DUR }, transitionStart);
      tl.to(flower, { width: "100%", duration: WAVE_TRANSITION_DUR }, transitionStart);
      tl.to(start, { x: "-0.08em", duration: WAVE_TRANSITION_DUR }, transitionStart);
      tl.to(end, { x: "0.08em", duration: WAVE_TRANSITION_DUR }, transitionStart);

      tl.to(zoomTarget, {
        color: COLOR_SAND,
        duration: 0.45,
        ease: "power2.inOut",
      }, transitionStart + WAVE_TRANSITION_DUR * 0.5);

      tl.to(subLetters,
        { y: "0%", opacity: 1, stagger: 0.02, duration: 0.8, ease: "expo.out", force3D: true }, // FIX: GPU compositing
        transitionStart + 0.5
      );

      /* ── PHASE 3: Zoom ── */
      tl.add(() => {
        const rect = yellow.getBoundingClientRect();
        const targetRect = zoomTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        holeCX = `${cx}px`;
        holeCY = `${cy}px`;
        const ox = ((cx - targetRect.left) / targetRect.width) * 100;
        const oy = ((cy - targetRect.top) / targetRect.height) * 100;
        zoomTarget.style.transformOrigin = `${ox}% ${oy}%`;
        window.dispatchEvent(new CustomEvent("header-show"));
      }, transitionStart + WAVE_TRANSITION_DUR * 0.9);

      tl.to(yellowHole, {
        r: yellowRadius,
        duration: 0.6,
        onUpdate: () => applyMasks(hole.r, yellowHole.r),
      }, ">");

      tl.to(hole, {
        r: baseHoleRadius,
        duration: 0.5,
        onUpdate: () => applyMasks(hole.r, yellowHole.r),
      }, "<+0.1");

      const HOLE_BOOST = isMobile ? 1.25 : 1.1;
      tl.to(zoomTarget, {
        scale: zoomScale,
        duration: isMobile ? ZOOM_DUR * 0.8 : ZOOM_DUR,
        onUpdate: () => {
          const s = gsap.getProperty(zoomTarget, "scaleX") as number;
          applyMasks(baseHoleRadius * s * HOLE_BOOST, yellowRadius * s * HOLE_BOOST);
        },
      }, ">+0.1");

      tl.to([flower, yellow, start, end, subLetters], {
        opacity: 0,
        duration: ZOOM_DUR * 0.4,
      }, `<+${ZOOM_DUR * 0.1}`);

      tl.set(overlay, { display: "none" });
      tl.add(() => {
        // Pause and clean up the hidden background video to save resources
        if (peekVideo) {
          peekVideo.pause();
          peekVideo.removeAttribute("src");
          peekVideo.load();
        }
      });
    },
    { scope: rootRef }
  );

  const leftLetters = ["R", "E", "N", "A"];
  const rightLetters = ["B", "I", "A", "N", "C", "A"];

  return (
    <div ref={rootRef}>
      <video
        ref={fullVideoRef}
        autoPlay
        className="pointer-events-none fixed inset-0 z-10 h-full w-full object-cover"
        style={{ opacity: 0, backgroundColor: COLOR_NAVY }}
        muted playsInline preload="auto"
        src={VIDEO_SRC}
        onEnded={handleVideoEnded}
      />

      <div data-overlay className="pointer-events-none fixed inset-0 z-50 overflow-hidden" style={{ backfaceVisibility: "hidden", transform: "translateZ(0)" }}>
        <video
          data-peek-video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ zIndex: 0 }}
          muted playsInline preload="auto"
        />

        <div 
          data-mask-group 
          className="absolute inset-0" 
          style={{ 
            zIndex: 1, 
            isolation: "isolate", 
            transform: "translateZ(0)",
            maskImage: "radial-gradient(circle var(--hole-r) at var(--hole-cx) var(--hole-cy), transparent 0px, transparent var(--hole-r), black var(--hole-r))",
            WebkitMaskImage: "radial-gradient(circle var(--hole-r) at var(--hole-cx) var(--hole-cy), transparent 0px, transparent var(--hole-r), black var(--hole-r))"
          }}
        >
          <div data-overlay-bg className="absolute inset-0 bg-white" style={{ zIndex: 1 }} />
          <div data-waves className="absolute inset-0" style={{ zIndex: 2 }}>
            {WAVES.map((w, i) => (
              <div
                key={i}
                data-wave
                className="absolute inset-0"
                style={{
                  backgroundColor: w.color,
                  zIndex: i + 1,
                  backfaceVisibility: "hidden",
                }}
              >
                <svg className="absolute left-0 w-full" style={{ bottom: "100%", height: 80 }} viewBox="0 0 1440 100" preserveAspectRatio="none">
                  <path d={w.path} style={{ fill: w.color }} />
                </svg>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex h-full w-full items-center justify-center px-3 sm:px-6 md:px-8" style={{ zIndex: 10 }}>
          <div data-zoom-target className="flex w-full max-w-full flex-col items-center" style={{ backfaceVisibility: "hidden", transform: "translateZ(0)" }}>
            <div
              data-heading
              className="flex w-full items-center justify-center whitespace-nowrap font-heading"
              style={{
                fontSize: "clamp(1.25rem, min(10.5vw, 16dvh), 11rem)",
                fontWeight: 500,
                lineHeight: 0.85,
                fontFamily: "var(--font-heading), var(--font-heading-fallback)",
              }}
            >
              <div data-start className="flex flex-1 justify-end">
                {leftLetters.map((l, i) => (
                  <span key={`l-${i}`} className="inline-block overflow-hidden">
                    <span 
                      data-letter 
                      className="inline-block"
                      style={{ transform: "translateY(110%)" }}
                    >
                      {l}
                    </span>
                  </span>
                ))}
              </div>

              <div data-box className="relative flex shrink-0 items-center justify-center" style={{ width: 0 }}>
                <div className="relative flex items-center justify-center" style={{ minWidth: "1em", height: "1em" }}>
                  <div data-flower className="absolute flex items-center justify-center overflow-hidden" style={{ width: "0%", height: "100%" }}>
                    <div className="relative flex items-center justify-center" style={{ minWidth: "1em", width: "100%", height: "100%" }}>
                      <div
                        data-yellow
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFD12D]"
                        style={{ 
                          width: "35%", 
                          height: "35%", 
                          zIndex: 1,
                          maskImage: "radial-gradient(circle var(--hole-r) at 50% 50%, transparent 0px, transparent var(--hole-r), black var(--hole-r))",
                          WebkitMaskImage: "radial-gradient(circle var(--hole-r) at 50% 50%, transparent 0px, transparent var(--hole-r), black var(--hole-r))"
                        }}
                      />
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
                    <span 
                      data-letter 
                      className="inline-block"
                      style={{ transform: "translateY(110%)" }}
                    >
                      {l}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div
              className="mt-2 flex flex-wrap justify-center font-body uppercase opacity-70"
              style={{
                fontSize: "clamp(0.6rem, min(2.2vw, 3dvh), 1.25rem)",
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
