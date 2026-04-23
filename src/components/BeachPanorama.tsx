"use client";

import { useRef, useState, useCallback, useEffect, type MouseEvent } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PANORAMA_SLIDES } from "@/data/panoramaSlides";

gsap.registerPlugin(useGSAP, ScrollTrigger);

if (typeof window !== "undefined") {
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/* ═══════════════════════════════════════════════════════════════
   BEACH PANORAMA
   ─────────────────────────────────────────────────────────────
   Architecture:

     ┌─────────────────────────────────────────────┐
     │ COVER LAYER (z-30)                          │   ← opaque card
     │   • "Panorama" wordmark + subtitle          │     with hinge at
     │   • Hinges from its TOP edge                │     the top edge
     │   • rotateX 0 → −105° + opacity 1 → 0       │     ("calendar
     │     so it peels AND fades simultaneously    │      opening" feel)
     └─────────────────────────────────────────────┘
     ┌─────────────────────────────────────────────┐
     │ SLIDESHOW LAYER (z-10)                      │   ← always there,
     │   • 5 slides, parallax wipe between them    │     revealed when
     │   • Thumbnail strip + auto-changing title   │     the cover flips
     └─────────────────────────────────────────────┘

   Scroll choreography — MATCHES GALLERY PATTERN:
     `pin: true, scrub: 1, end: "+=200%"` with NO snap, so the
     pin holds the section in place and scroll smoothly scrubs
     through three beats: cover flips & fades → slide 0→1 wipes
     → slide 1→2 wipes → pin releases. The magnetic feel comes
     from the pin itself (scroll is eaten, section feels stuck)
     without `snap`'s jitter. Once all three beats play, the
     page unlocks and scrolling continues naturally.
   ═══════════════════════════════════════════════════════════════ */

const SLIDES = PANORAMA_SLIDES;
const WIPE_DUR = 1.2;

export default function BeachPanorama() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const coverInnerRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  /* `currentRef` mirrors `current` so the scroll-driven onUpdate
     callback (which closes over its initial value) can read the
     latest slide index without re-creating the timeline. */
  const currentRef = useRef(0);
  const animatingRef = useRef(false);
  const slideEls = useRef<(HTMLDivElement | null)[]>([]);
  const innerEls = useRef<(HTMLImageElement | null)[]>([]);
  const thumbInnerEls = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    const syncViewport = () => setIsMobileViewport(window.innerWidth < 768);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    return () => {
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
    };
  }, []);

  /* ── Slideshow navigation (parallax wipe) ─────────────────── */
  const navigate = useCallback((targetIndex: number) => {
    const cur = currentRef.current;
    if (
      animatingRef.current ||
      targetIndex === cur ||
      targetIndex < 0 ||
      targetIndex >= SLIDES.length
    ) {
      return;
    }
    animatingRef.current = true;
    const wipeDuration = typeof window !== "undefined" && window.innerWidth < 768 ? 0.85 : WIPE_DUR;

    const dir = targetIndex > cur ? 1 : -1;
    const curSlide = slideEls.current[cur];
    const curInner = innerEls.current[cur];
    const nextSlide = slideEls.current[targetIndex];
    const nextInner = innerEls.current[targetIndex];

    if (!curSlide || !nextSlide) {
      animatingRef.current = false;
      return;
    }

    gsap
      .timeline({
        defaults: { duration: wipeDuration, ease: "expo.inOut" },
        onStart: () => {
          nextSlide.style.opacity = "1";
          nextSlide.style.pointerEvents = "auto";
          currentRef.current = targetIndex;
          setCurrent(targetIndex);
        },
        onComplete: () => {
          curSlide.style.opacity = "0";
          curSlide.style.pointerEvents = "none";
          gsap.set(curSlide, { xPercent: 0 });
          if (curInner) gsap.set(curInner, { xPercent: 0 });
          animatingRef.current = false;
        },
      })
      .to(curSlide, { xPercent: -dir * 100 }, 0)
      .to(curInner, { xPercent: dir * 75 }, 0)
      .fromTo(nextSlide, { xPercent: dir * 100 }, { xPercent: 0 }, 0)
      .fromTo(nextInner, { xPercent: -dir * 75 }, { xPercent: 0 }, 0);
  }, []);

  /* ── Pinned cover-flip + auto-advance + magnetic snap ─────── */
  useGSAP(
    () => {
      const section = sectionRef.current;
      const cover = coverRef.current;
      const coverInner = coverInnerRef.current;
      if (!section || !cover) return;

      /* The cover hinges from its TOP edge — `transform-origin:
         50% 0%`. Combined with `transformPerspective: 1500` and
         `transformStyle: "preserve-3d"` on the section, the
         scrub'd `rotationX` produces the calendar-flip feel the
         brief asks for. */
      gsap.set(cover, {
        rotationX: 0,
        opacity: 1,
        transformOrigin: "50% 0%",
        transformPerspective: isMobileViewport ? 1100 : 1500,
        force3D: !isMobileViewport,
      });
      if (coverInner) gsap.set(coverInner, { y: 0, opacity: 1 });

      /* Track which auto-advance beats have already fired so each
         is triggered only once when its progress threshold is
         crossed forward. Going backward resets the flags. */
      const fired = { adv1: false, adv2: false, adv3: false };

      /* Progress thresholds — the whole pin runs from 0 → 1 and
         is split into FOUR equal beats so the cover flip + three
         slide advances all get the same scroll distance and feel
         equally quick:
            0.00 – 0.25  cover flip + fade
            0.25 – 0.50  slide 0 → 1
            0.50 – 0.75  slide 1 → 2
            0.75 – 1.00  slide 2 → 3
         Each ADV trigger fires a hair after its beat starts so
         the parallax wipe has room to play without being scrubbed
         by the user's next scroll increment. */
      const FLIP_END = 0.25;
      const ADV1 = 0.32;
      const ADV2 = 0.57;
      const ADV3 = 0.82;

      gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => (isMobileViewport ? "+=180%" : "+=220%"),
          pin: true,
          pinSpacing: true,
          pinType: "fixed",
          /* scrub: 1 matches the gallery — a single-frame lag so
             Lenis smooth-scroll inertia doesn't race the DOM
             writes. No `snap`: snap + Lenis fights with user
             momentum and causes the "skipping" the user saw.
             The pin itself already gives the magnetic feel. */
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          /* `fastScrollEnd: true` + `preventOverlaps` together
             solve the "fast swipe skips a pinned section" bug.
             Any swipe that would otherwise fling the user past
             this pin gets clamped so the panorama flip + three
             slide advances ALL get a chance to play. All pinned
             sections on the page share the group name `"pinned"`,
             so at most one pin is ever engaged at a time and
             they take turns as the user scrolls. */
          fastScrollEnd: !isMobileViewport,
          preventOverlaps: isMobileViewport ? false : "pinned",
          /* Threshold-crossing trigger for the three scripted
             slide advances. Each one fires exactly once per
             direction so the cover-flip and the auto-cycle never
             compete. Reverse-scroll resets flags in reverse. */
          onUpdate: (self) => {
            const p = self.progress;
            if (p > ADV1 && !fired.adv1) {
              fired.adv1 = true;
              navigate(1);
            }
            if (p > ADV2 && !fired.adv2) {
              fired.adv2 = true;
              navigate(2);
            }
            if (p > ADV3 && !fired.adv3) {
              fired.adv3 = true;
              navigate(3);
            }
            if (p < ADV1 - 0.03) {
              fired.adv1 = false;
              fired.adv2 = false;
              fired.adv3 = false;
              if (currentRef.current !== 0) navigate(0);
            } else if (p < ADV2 - 0.03) {
              fired.adv2 = false;
              fired.adv3 = false;
              if (currentRef.current > 1) navigate(1);
            } else if (p < ADV3 - 0.03) {
              fired.adv3 = false;
              if (currentRef.current > 2) navigate(2);
            }
          },
        },
      })
        /* PHASE 1 (0 → FLIP_END): COVER FLIPS AWAY and FADES.
           `rotationX` overshoots past −90° so the cover ends up
           clearly behind the camera plane. `opacity` runs in
           parallel from 1 → 0 over the full flip so the card
           literally dissolves while it tilts — no hard pop at
           the end. Inner wordmark lifts a touch and fades a
           hair early so the eye sees the text leave before the
           geometry does. */
        .to(
          cover,
          { rotationX: -110, duration: FLIP_END, ease: "power2.inOut" },
          0
        )
        .to(
          cover,
          { opacity: 0, duration: FLIP_END, ease: "power2.in" },
          0
        )
        .to(
          coverInner ?? {},
          { y: -40, duration: FLIP_END * 0.85, ease: "power2.in" },
          0.02
        )
        .to(
          coverInner ?? {},
          { opacity: 0, duration: FLIP_END * 0.55, ease: "power2.in" },
          FLIP_END * 0.4
        );

      /* PHASES 2 + 3 live in onUpdate above (navigate()). They
         stay off the timeline so the parallax wipe plays at its
         own pace without being scrubbed backwards frame-by-frame
         by the user's scroll. */
    },
    { scope: sectionRef, dependencies: [isMobileViewport] }
  );

  const onThumbMove = useCallback((index: number, e: MouseEvent<HTMLButtonElement>) => {
    const inner = thumbInnerEls.current[index];
    if (!inner) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);

    gsap.to(inner, {
      x: dx * 0.16,
      y: dy * 0.16,
      scale: 1.08,
      duration: 0.35,
      ease: "power3.out",
      overwrite: true,
    });
  }, []);

  const onThumbLeave = useCallback((index: number) => {
    const inner = thumbInnerEls.current[index];
    if (!inner) return;

    gsap.to(inner, {
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.5,
      ease: "elastic.out(1, 0.45)",
      overwrite: true,
    });
  }, []);

  return (
    <section
      id="panorama"
      ref={sectionRef}
      className="relative h-dvh w-full overflow-hidden pt-20"
      style={{
        background:
          "linear-gradient(180deg, #0A192F 0%, #0d2240 15%, #122a45 50%, #0d2240 85%, #0A192F 100%)",
        perspective: isMobileViewport ? "1100px" : "1500px",
        transformStyle: "preserve-3d",
      }}
    >
      {/* ═══ SLIDESHOW LAYER (sits behind the cover, revealed
           after the calendar flip) ═══ */}
      <div className="absolute inset-0 z-10">
        <div
          className="grid h-full w-full"
          style={{ gridTemplateRows: "100%", gridTemplateColumns: "100%" }}
        >
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              ref={(el) => {
                slideEls.current[i] = el;
              }}
              className={`relative grid place-items-center overflow-hidden ${isMobileViewport ? "" : "will-change-transform"}`}
              style={{
                gridArea: "1 / 1 / -1 / -1",
                opacity: i === 0 ? 1 : 0,
                pointerEvents: i === 0 ? "auto" : "none",
              }}
            >
              <img
                ref={(el) => {
                  innerEls.current[i] = el;
                }}
                src={slide.src}
                alt={t(slide.titleKey)}
                loading={i < 2 ? "eager" : "lazy"}
                draggable={false}
                className={`absolute h-full w-full object-cover ${isMobileViewport ? "" : "will-change-transform"}`}
              />
            </div>
          ))}
        </div>

        {/* Vignette top + bottom so the floating texts read well
            over any photo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,25,47,0.55) 0%, rgba(10,25,47,0.05) 30%, rgba(10,25,47,0.05) 70%, rgba(10,25,47,0.55) 100%)",
          }}
        />

        {/* Slide title — absolute centre so it floats over the
            photo. Updates per `current`. */}
        <div className="pointer-events-none absolute inset-x-0 top-[clamp(2.5rem,8dvh,7rem)] z-10 flex flex-col items-center px-6 text-center">
          <h2
            key={current}
            className="font-heading text-sand"
            style={{
              fontSize: "clamp(1.6rem, calc(2vw + 3dvh), 4rem)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              textShadow: "0 4px 24px rgba(0,0,0,0.55)",
              animation: "panoSlideTitleIn 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            {t(SLIDES[current].titleKey)}
          </h2>
          <p
            key={`sub-${current}`}
            className="mx-auto mt-3 max-w-xl font-body text-sm text-sand/80 sm:text-base md:text-lg"
            style={{
              textShadow: "0 2px 14px rgba(0,0,0,0.6)",
              animation: "panoSlideTitleIn 600ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both",
            }}
          >
            {t(SLIDES[current].subtitleKey)}
          </p>
        </div>
      </div>

      {/* ═══ COVER LAYER — calendar-flip preloader. Hinges at
           `transform-origin: 50% 0%`, scrub'd to `rotateX: −110°`
           by the ScrollTrigger above. ═══ */}
      <div
        ref={coverRef}
        className={`absolute inset-0 z-30 ${isMobileViewport ? "" : "will-change-transform"}`}
        style={{
          background:
            "linear-gradient(180deg, #0A192F 0%, #0d2240 35%, #122a45 65%, #0d2240 100%)",
          backfaceVisibility: "hidden",
          /* Matches `box-shadow` of a real layered card so the
             flip reads as a physical page lifting off. */
          boxShadow:
            "0 30px 60px -20px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div
          ref={coverInnerRef}
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-sand"
        >
          <h1
            className="font-heading text-sand"
            style={{
              fontSize: "clamp(3rem, calc(6vw + 6dvh), 12rem)",
              fontWeight: 400,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              textShadow: "0 6px 30px rgba(0,0,0,0.6)",
            }}
          >
            {t("panorama.heading")}
          </h1>
          <p
            className="mt-5 max-w-md font-body text-base text-sand/70 md:text-lg"
            style={{ textShadow: "0 2px 14px rgba(0,0,0,0.55)" }}
          >
            {t("panorama.label")}
          </p>
        </div>
      </div>

      {/* ═══ THUMBNAIL STRIP — bottom, always interactive ═══ */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-[clamp(1.5rem,4dvh,3rem)] z-20 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 overflow-hidden rounded-md p-2 md:gap-3">
          {SLIDES.map((slide, i) => (
            <button
              key={i}
              onMouseMove={(e) => onThumbMove(i, e)}
              onMouseLeave={() => onThumbLeave(i)}
              onClick={() => navigate(i)}
              className={`relative overflow-hidden rounded transition-all ${isMobileViewport ? "" : "will-change-transform"}`}
              style={{
                width: "clamp(40px, 5vw, 56px)",
                height: "clamp(40px, 5vw, 56px)",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: current === i ? "rgba(253,251,247,1)" : "transparent",
                transition: "border-color 0.75s cubic-bezier(0.625, 0.05, 0, 1)",
              }}
            >
              <span
                ref={(el) => {
                  thumbInnerEls.current[i] = el;
                }}
                className={`absolute inset-0 block ${isMobileViewport ? "" : "will-change-transform"}`}
              >
                <img
                  src={slide.src}
                  alt={t(slide.titleKey)}
                  loading="eager"
                  className="absolute inset-0 h-full w-full rounded-[inherit] object-cover transition-transform"
                  style={{
                    transform: "scale(1.05) rotate(0.001deg)",
                    transition: "transform 0.75s cubic-bezier(0.625, 0.05, 0, 1)",
                  }}
                />
              </span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes panoSlideTitleIn {
          0% { opacity: 0; transform: translateY(14px); filter: blur(6px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        
        /* Apply background cleanly to the GSAP pin-spacer wrapping this specific section
           so that if recalculations delay, the background seamlessly covers the void. */
        .pin-spacer:has(#panorama) {
          background-color: #0A192F !important;
        }
      `}</style>
    </section>
  );
}
