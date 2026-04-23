"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HEADER_H, LOGO_DOCKED_W, LOGO_DOCKED_H } from "./Header";
import { useI18n } from "@/i18n/I18nProvider";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   PARALLAX LAYERS + LOGO DOCKING
   ─────────────────────────────────────────────────────────────
   z-[1]   Layer 1 — bottom bg, drifts down
   z-[2]   LOGO    — sandwiched between layers, centered
   z-[3]   Layer 3 — top scenery, drifts down
   z-[50]  Layer 4 — Text + buttons

   CRITICAL FLOW:
   1. Initially ONLY layer-bottom + layer-top visible.
      Text layer + Logo = opacity:0.
   2. Video plays on top (z-10 from HeroSection).
   3. When video ends → 'video-ended' event fires.
   4. THEN text + logo fade in smoothly.
   5. On scroll: logo translates UP + scales down → docks into
      <Header /> using scrub:1 for butter-smooth motion.
   ═══════════════════════════════════════════════════════════════ */

const LAYER_BG_DRIFT  = 50;
const LAYER_TOP_DRIFT = 18;
const TEXT_DRIFT      = 5;

/* ── Responsive logo metrics — recomputed on every ScrollTrigger refresh
   (= on window resize, because Lenis/GSAP calls refresh automatically). ── */
function getLogoMetrics() {
  const vw = typeof window === "undefined" ? 1200 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : (window.visualViewport?.height ?? window.innerHeight);
  // Three breakpoints so the logo never overflows or looks tiny on tablets
  const isMobile = vw < 640;
  const isTablet = vw >= 640 && vw < 1024;
  // Base (hero rest) width — capped so it never exceeds the viewport
  const startW = Math.min(
    vw - 32,
    isMobile ? 260 : isTablet ? 360 : 440
  );
  const startH = startW * (200 / 600); // logo.svg aspect 600:200
  // Docked size in the header — trimmed even more than before so
  // there's generous breathing room between the logo and the
  // flanking elements (lang + social on the left, nav / hamburger
  // on the right). Old values felt "touching" on mid-size screens;
  // these dial them back further and ALSO key off the actual
  // viewport width so on ~320px phones the logo never collides
  // with the hamburger button. `Math.min(…, vw * 0.28)` acts as a
  // hard cap: at most 28 % of the screen belongs to the logo,
  // leaving > 70 % of the header width free for the other UI.
  const dockW = Math.min(
    vw * 0.28,
    isMobile
      ? Math.round(LOGO_DOCKED_W * 0.58)   // ~70px
      : isTablet
      ? Math.round(LOGO_DOCKED_W * 0.72)   // ~86px
      : Math.round(LOGO_DOCKED_W * 0.82)   // ~98px
  );
  const dockH = dockW * (LOGO_DOCKED_H / LOGO_DOCKED_W); // keep SVG aspect
  const dockY = HEADER_H / 2;
  // Hero-rest center for the fixed dock logo. Must match the SCENE logo
  // position (top-[34%] inside a h-[120%] layer ≈ 40.8dvh of the viewport)
  // so the scene→dock hand-off is visually seamless. Clamped so it never
  // overlaps the header on very short landscape viewports.
  // "A touch higher than before" per the brief — user must always see
  // the logo at rest, peeking from behind layer-top.
  const startTop = Math.max(HEADER_H + startH / 2 + 12, vh * 0.408);
  return { startW, startH, dockW, dockH, dockY, startTop };
}

export default function HeroVideoParallax() {
  const { t } = useI18n();
  const introTitle = t("about.title");
  const introTitleLetters = introTitle.split("");
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const sceneLogoRef = useRef<HTMLImageElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [logoDocked, setLogoDocked] = useState(false);

  /* ── Smooth "scroll-to-top" that prefers Lenis (SmoothScrollProvider) and
        falls back to the native engine when it's not available. ── */
  const scrollToTop = () => {
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number | string | HTMLElement, o?: { duration?: number; offset?: number; easing?: (t: number) => number }) => void } }).__lenis;
    if (lenis && typeof lenis.scrollTo === "function") {
      lenis.scrollTo(0, { duration: 1.4 });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* ── Smooth jump to a `#hash` target. Prevents the browser's default
        instant anchor-jump on phones (which feels jarring after a tap)
        and routes everything through Lenis so the motion matches the
        rest of the page. ── */
  const smoothScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    const el = document.querySelector(hash);
    if (!el) return;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number | string | HTMLElement, o?: { duration?: number; offset?: number; easing?: (t: number) => number }) => void } }).__lenis;
    if (lenis && typeof lenis.scrollTo === "function") {
      lenis.scrollTo(el as HTMLElement, { duration: 1.4, offset: -40 });
    } else {
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  /* ── React-side mirror of the 'logo-docked' custom event so we can toggle
        click-to-top / pointer-events on the dock logo when it's in the header. ── */
  useEffect(() => {
    const onDock = (e: Event) => setLogoDocked((e as CustomEvent).detail?.docked ?? false);
    window.addEventListener("logo-docked", onDock);
    return () => window.removeEventListener("logo-docked", onDock);
  }, []);

  /* ── Listen for 'video-ended' → reveal text + logo ── */
  useEffect(() => {
    const onVideoEnded = () => setVideoEnded(true);
    window.addEventListener("video-ended", onVideoEnded, { once: true });
    // Fallback in case video never ends (e.g. autoplay blocked)
    const fallback = setTimeout(onVideoEnded, 6000);
    return () => {
      window.removeEventListener("video-ended", onVideoEnded);
      clearTimeout(fallback);
    };
  }, []);

  /* ── Fade in text + logo AFTER video ends ── */
  useEffect(() => {
    if (!videoEnded) return;
    const sceneLogo = sceneLogoRef.current;
    const textLayer = textLayerRef.current;
    // Scene logo (absolute, sandwiched between parallax layers) fades in first
    if (sceneLogo) {
      gsap.to(sceneLogo, { opacity: 1, duration: 1.2, ease: "power2.out" });
    }
    if (textLayer) {
      gsap.to(textLayer, { opacity: 1, duration: 1.2, ease: "power2.out", delay: 0.2 });
    }
  }, [videoEnded]);

  /* ── Parallax layers (bg + top scenery + text) ── */
  useGSAP(
    () => {
      const trigger = layersRef.current;
      if (!trigger) return;

      const layerBg   = trigger.querySelector('[data-parallax-layer="1"]');
      const layerTop  = trigger.querySelector('[data-parallax-layer="3"]');
      const textLayer = textLayerRef.current;

      if (!layerBg || !layerTop || !textLayer) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger,
          start: "0% 0%",
          end: "100% 0%",
          scrub: 1,
        },
      });

      tl.to(layerBg, { yPercent: LAYER_BG_DRIFT, ease: "none", duration: 1 }, 0);
      tl.to(layerTop, { yPercent: LAYER_TOP_DRIFT, ease: "none", duration: 1 }, 0);
      tl.to(textLayer, { yPercent: TEXT_DRIFT, ease: "none", duration: 1 }, 0);
      // Fade out text layer only after 30% scroll — preserves fade-in from video
      tl.to(textLayer, { opacity: 0, ease: "none", duration: 0.4 }, 0.3);
    },
    { scope: containerRef }
  );

  /* ── LOGO docking flow ──────────────────────────────────────────
     Goal: the instant the user starts scrolling, the logo shrinks
     and flies straight up into the header. The docking completes
     while they are STILL inside the parallax section, so they can
     see the docked header logo simultaneously with the hero
     scenery around them.

     PHASE A (0 → HANDOFF_P):  scene logo is visible at rest inside
       the parallax stack (z:2, between layer-bottom and layer-top,
       literally peeking out from behind the top scenery). The fixed
       dock logo is hidden. HANDOFF_P is tiny (~3% of the hero scroll)
       so this phase is effectively "the moment they haven't scrolled
       yet".
     PHASE B (= HANDOFF_P):  snap hand-off. We measure the scene
       logo's CURRENT viewport rect, place the dock logo at that
       exact pixel position/size with zero duration, elevate its
       z-index above the header, and hide the scene logo. Because we
       copy the live rect there is no jump, no rotation, no slide —
       the swap is visually invisible.
     PHASE C (HANDOFF_P → DOCK_P):  fixed dock logo glides straight
       UP and shrinks linearly-with-ease to the header dock target.
       DOCK_P sits well inside the parallax scroll range (~40%), so
       the logo is already docked long before the user leaves the
       hero.
     PHASE D (≥ DOCK_P):  docked in the header, click-to-top enabled.

     Responsive: all target metrics recompute on every refresh so
     the docking target follows the current viewport. */
  useGSAP(
    () => {
      const logo = logoRef.current;
      const sceneLogo = sceneLogoRef.current;
      const container = containerRef.current;
      if (!logo || !sceneLogo || !container) return;

      /* Hand-off happens almost immediately — the moment the user
         starts scrolling, the dock logo takes over. */
      const HANDOFF_P = 0.03;
      /* Docking is COMPLETE at this scroll progress — well before
         the parallax ends, so the header logo is visible while the
         hero scenery still surrounds it. */
      const DOCK_P = 0.4;

      let wasDocked = false;
      let wasHandedOff = false;
      // Pixel snapshot of the scene logo at the moment of hand-off.
      // Used as the START values for the dock-logo glide, so the
      // swap is visually invisible (the dock logo materialises at
      // the exact same place + size as the scene logo).
      let snapshot: { top: number; width: number; height: number } | null = null;

      // Base style for the dock logo (fixed, centered). Dimensions
      // start at 0 and stay invisible until the hand-off.
      gsap.set(logo, {
        position: "fixed",
        left: "50%",
        xPercent: -50,
        yPercent: -50,
        opacity: 0,
        zIndex: 115,
      });

      const applyIdleSizes = () => {
        const m = getLogoMetrics();
        gsap.set(sceneLogo, { width: m.startW, height: m.startH });
      };
      applyIdleSizes();

      ScrollTrigger.create({
        trigger: container,
        start: "0% 0%",
        end: "60% 0%",
        scrub: 0.4,
        invalidateOnRefresh: true,
        onRefresh: applyIdleSizes,
        onUpdate: (self) => {
          const p = self.progress;
          const m = getLogoMetrics();
          const handedOff = p >= HANDOFF_P;

          if (handedOff !== wasHandedOff) {
            wasHandedOff = handedOff;
            if (handedOff) {
              // Snap the dock logo to the scene logo's live rect.
              const r = sceneLogo.getBoundingClientRect();
              snapshot = {
                top: r.top + r.height / 2,
                width: r.width,
                height: r.height,
              };
              gsap.set(logo, {
                top: snapshot.top,
                width: snapshot.width,
                height: snapshot.height,
                opacity: 1,
                zIndex: 220,
              });
              gsap.set(sceneLogo, { opacity: 0 });
              sceneLogo.style.zIndex = "50";
            } else {
              gsap.set(logo, { opacity: 0 });
              gsap.set(sceneLogo, { opacity: 1 });
              sceneLogo.style.zIndex = "2";
              snapshot = null;
            }
          }

          if (handedOff && snapshot) {
            // Normalize glide progress over the HANDOFF_P → DOCK_P
            // window, clamped so after DOCK_P the logo sits rock-
            // steady in the header while the rest of the hero keeps
            // scrolling underneath.
            const t = Math.min(
              1,
              Math.max(0, (p - HANDOFF_P) / (DOCK_P - HANDOFF_P))
            );
            const eased = gsap.parseEase("power2.out")(t);
            const top    = snapshot.top    + (m.dockY  - snapshot.top)    * eased;
            const width  = snapshot.width  + (m.dockW  - snapshot.width)  * eased;
            const height = snapshot.height + (m.dockH  - snapshot.height) * eased;
            gsap.set(logo, { top, width, height });
          }

          const docked = p >= DOCK_P;
          if (docked !== wasDocked) {
            wasDocked = docked;
            window.dispatchEvent(
              new CustomEvent("logo-docked", { detail: { docked } })
            );
          }
        },
      });
    },
    { scope: containerRef }
  );

  /* ── Animated "O nas" title ── */
  useGSAP(
    () => {
      const el = introRef.current;
      if (!el) return;
      const letters = el.querySelectorAll("[data-intro-letter]");
      if (!letters.length) return;

      const subLetters = el.querySelectorAll("[data-intro-sub]");

      gsap.set(letters, { yPercent: 120, opacity: 0 });
      gsap.set(subLetters, { yPercent: 120, opacity: 0 });

      // Scroll-driven letter-by-letter reveal
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          end: "top 20%",
          scrub: 0.8,
        },
      });

      tl.to(letters, {
        yPercent: 0,
        opacity: 1,
        stagger: 0.06,
        duration: 1,
        ease: "power3.out",
      }, 0);

      tl.to(subLetters, {
        yPercent: 0,
        opacity: 1,
        stagger: 0.02,
        duration: 0.8,
        ease: "power3.out",
      }, 0.3);
    },
    { scope: containerRef }
  );

  return (
    <>
    {/* ── DOCK LOGO — position:fixed, outside containerRef so overflow/transforms can't break it.
          Takes the baton from the scene logo during scroll and flies into the header at z:115
          (above the header chrome at z:100 → logo is ALWAYS on top in the header).
          When docked: becomes clickable → smooth-scrolls the page back to the very top. ── */}
    <img
      ref={logoRef}
      data-parallax-logo
      src="/logo.svg"
      alt="Rena Bianca"
      draggable={false}
      role={logoDocked ? "button" : undefined}
      tabIndex={logoDocked ? 0 : -1}
      aria-label={logoDocked ? "Przewiń na górę strony" : undefined}
      onClick={logoDocked ? scrollToTop : undefined}
      onKeyDown={
        logoDocked
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                scrollToTop();
              }
            }
          : undefined
      }
      className={`fixed left-1/2 top-1/2 select-none will-change-transform transition-[filter] duration-300
        ${logoDocked
          ? "cursor-pointer drop-shadow-[0_4px_14px_rgba(59,130,196,0.35)] hover:drop-shadow-[0_8px_22px_rgba(59,130,196,0.6)] hover:scale-[1.04]"
          : "pointer-events-none drop-shadow-2xl"
        } transition-transform duration-300`}
      style={{ opacity: 0, width: 0, height: 0, transform: "translate(-50%, -50%)", zIndex: 115 }}
    />

    <div ref={containerRef} data-parallax-container className="relative w-full overflow-hidden">
      {/* ── Parallax hero ── */}
      <section className="relative z-2 flex min-h-dvh w-full items-center justify-center overflow-hidden p-0">
        <div className="absolute left-0 top-0 h-[120%] w-full">
          <div
            ref={layersRef}
            data-parallax-layers
            className="absolute left-0 top-0 h-full w-full overflow-hidden"
          >
            {/* Layer 1 — Bottom background (z-1) */}
            <img
              data-parallax-layer="1"
              src="/layer-bottom.png"
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-0 -top-[17.5%] z-1 h-[117.5%] w-full object-cover will-change-transform"
            />

                {/* Layer 2 — SCENE LOGO: sandwiched between bottom (z-1) and top scenery (z-3)
                     so it literally emerges from behind the top layer in the hero rest state.
                     A soft radial halo sits BEHIND the logo so it visually
                     pops against the parallax artwork without overriding
                     the drop-shadow treatment in the header. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[34%] z-2 -translate-x-1/2 -translate-y-1/2 will-change-[opacity,transform]"
                  style={{
                    width: "clamp(360px, 60vw, 620px)",
                    aspectRatio: "1 / 1",
                    opacity: 0.55,
                    background:
                      "radial-gradient(closest-side, rgba(253,251,247,0.35) 0%, rgba(253,251,247,0.12) 40%, transparent 72%)",
                    mixBlendMode: "screen",
                    filter: "blur(2px)",
                  }}
                />
                <img
                  ref={sceneLogoRef}
                  src="/logo.svg"
                  alt="Rena Bianca"
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-[34%] z-2 -translate-x-1/2 -translate-y-1/2 select-none will-change-[opacity,transform]"
                  style={{
                    opacity: 0,
                    filter:
                      "drop-shadow(0 8px 30px rgba(0,0,0,0.45)) drop-shadow(0 0 22px rgba(142,197,232,0.35))",
                  }}
                />

            {/* Layer 3 — Top scenery (z-3) — sits OVER the scene logo */}
            <img
              data-parallax-layer="3"
              src="/layer-top.png"
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-0 -top-[17.5%] z-3 h-[117.5%] w-full object-cover will-change-transform"
            />

            {/* Layer 4 — Text + buttons (z-50) — starts hidden.
                 `justify-end` + bottom padding pushes the whole
                 content block INTO THE LOWER HALF of the hero, so
                 the logo at top-[34%] never gets covered by the
                 subtitle/CTA stack — there's clear airspace
                 between the logo and the text block on every
                 viewport height. */}
            <div
              ref={textLayerRef}
              data-parallax-layer="4"
              className="absolute left-0 top-0 z-50 flex h-dvh w-full flex-col items-center justify-end gap-5 pb-52 sm:pb-64 md:pb-72 will-change-transform"
              style={{ opacity: 0 }}
            >
              {/* ── Hero subtitle — delicate italic line anchored by
                    a hairline rule. Positioned low in the hero so
                    the logo above it stays fully visible, while
                    still being the first thing the eye reads once
                    the video fades. ── */}
              <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-2 px-5 text-center sm:gap-3 sm:px-8">
                <p
                  className="font-heading italic text-white"
                  style={{
                    fontSize: "clamp(20px, 3.4vw, 38px)",
                    lineHeight: 1.25,
                    letterSpacing: "0.015em",
                    textAlign: "center",
                    marginInline: "auto",
                    fontFamily: 'Combo, "Combo Fallback", Combo, serif',
                    textShadow:
                      "0 2px 14px rgba(0,0,0,0.82), 0 0 32px rgba(59,130,196,0.28), 0 0 60px rgba(0,0,0,0.35)",
                    maxInlineSize: "24ch",
                  }}
                >
                  {t("hero.subtitle")}
                </p>
                <span
                  aria-hidden
                  className="block h-px w-24 sm:w-36"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(253,251,247,0.85), transparent)",
                  }}
                />
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <a
                  href="#reservation"
                  onClick={(e) => smoothScrollTo(e, "#reservation")}
                  className="rounded-full bg-ocean px-5 py-3 font-body text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_-8px_rgba(59,130,196,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-ocean/90 hover:shadow-[0_14px_36px_-8px_rgba(59,130,196,0.85)] sm:px-7 sm:py-3.5 sm:text-sm"
                >
                  {t("hero.reservation")}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("open-menu-popup"));
                  }}
                  className="rounded-full border border-white/40 bg-white/5 px-5 py-3 font-body text-xs font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/15 sm:px-7 sm:py-3.5 sm:text-sm"
                >
                  {t("hero.menu")}
                </button>
              </div>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                <div className="flex flex-col items-center gap-2 text-white/70">
                  <span className="font-body text-xs uppercase tracking-[0.3em]">{t("hero.scroll")}</span>
                  <svg width="20" height="30" viewBox="0 0 20 30" fill="none" className="opacity-60">
                    <rect x="1" y="1" width="18" height="28" rx="9" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="10" cy="10" r="2" fill="currentColor">
                      <animate attributeName="cy" values="10;18;10" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom fade gradient */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 z-45 h-[20%] w-full"
            style={{ background: "linear-gradient(to top, var(--color-navy) 0%, transparent 100%)" }}
          />
        </div>
      </section>

      {/* ── "O nas" section — gradient blue → warm sunset ── */}
      <section
        data-intro-section
        className="relative overflow-hidden pb-0 pt-20 sm:pt-28 md:pt-44"
        style={{ background: "linear-gradient(to bottom, #0A192F 0%, #1a3a5c 15%, #2a6a9e 30%, #5ba3d9 45%, #d4976a 65%, #cc7744 82%, #ff8855 100%)" }}
      >
        <div
          ref={introRef}
          className="relative z-10 mx-auto max-w-5xl px-5 sm:px-8 md:px-12 pb-16 sm:pb-24 md:pb-32"
        >
          <div className="flex flex-col items-center text-center">
            <h2 className="font-heading text-4xl sm:text-6xl md:text-8xl lg:text-9xl text-sand" style={{ lineHeight: 1.05 }}>
              {introTitleLetters.map((char: string, i: number) => (
                <span key={i} className="inline-block overflow-hidden">
                  <span data-intro-letter className="inline-block">
                    {char === " " ? "\u00A0" : char}
                  </span>
                </span>
              ))}
            </h2>

            {/* Decorative line */}
            <div className="mt-4 h-px w-24 sm:w-32 md:w-48" style={{ background: "linear-gradient(90deg, transparent, rgba(253,251,247,0.3), transparent)" }} />
          </div>

          <p className="mt-4 max-w-xl mx-auto text-center font-body text-base sm:text-lg md:text-xl text-sand/60 leading-relaxed tracking-wide sm:mt-6 md:mt-8">
            {t("about.description").split(" ").map((word: string, i: number) => (
              <span key={i} className="mr-[0.35em] inline-block overflow-hidden">
                <span data-intro-sub className="inline-block">
                  {word}
                </span>
              </span>
            ))}
          </p>

          <p className="mt-4 max-w-2xl mx-auto text-center font-body text-sm sm:text-base md:text-lg text-sand/75 leading-relaxed tracking-[0.03em]">
            {t("about.descriptionSecondary")}
          </p>

          <p className="mt-8 max-w-4xl mx-auto text-center font-heading text-lg uppercase tracking-[0.28em] text-sand/80 sm:text-2xl md:mt-10 md:text-4xl lg:text-5xl">
            {t("about.quote")}
          </p>
        </div>

      </section>
    </div>
    </>
  );
}
