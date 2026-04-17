"use client";

import { useRef, useState, useCallback, useEffect, type MouseEvent } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PANORAMA_SLIDES } from "@/data/panoramaSlides";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   BEACH PANORAMA
   ─────────────────────────────────────────────────────────────
   Architecture:

     ┌─────────────────────────────────────────────┐
     │ COVER LAYER (z-30)                          │   ← opaque card
     │   • "Panorama" wordmark + subtitle          │     with hinge at
     │   • Hinges from its TOP edge                │     the top edge
     │   • rotateX 0 → −105°, with perspective →   │     ("calendar
     │     looks like a calendar page lifting up   │      opening" feel)
     └─────────────────────────────────────────────┘
     ┌─────────────────────────────────────────────┐
     │ SLIDESHOW LAYER (z-10)                      │   ← always there,
     │   • 5 slides, parallax wipe between them    │     revealed when
     │   • Thumbnail strip + auto-changing title   │     the cover flips
     └─────────────────────────────────────────────┘

   Scroll choreography (ScrollTrigger pin, end="+=300%"):

     0.00 – 0.40   COVER FLIP — `rotateX` scrubbed by scroll, the
                   cover peels away from the top hinge. Magnetic
                   `snap` stop at 0.45 once the cover is gone.
     0.45 – 0.75   AUTO-ADVANCE #1 — slide 0 → slide 1 fires the
                   moment the user scrolls past the snap stop.
                   Magnetic snap to 0.75.
     0.75 – 1.00   AUTO-ADVANCE #2 — slide 1 → slide 2.
                   Magnetic snap to 1.0 → pin releases.

   Snap stops [0, 0.45, 0.75, 1] give the whole interaction the
   "magnetyczne odczucie" the brief asks for: every beat clicks
   into place instead of free-running.
   ═══════════════════════════════════════════════════════════════ */

const SLIDES = PANORAMA_SLIDES;
const WIPE_DUR = 1.2;

export default function BeachPanorama() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const coverInnerRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
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
        defaults: { duration: WIPE_DUR, ease: "expo.inOut" },
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
        transformPerspective: 1500,
      });
      if (coverInner) gsap.set(coverInner, { y: 0, opacity: 1 });

      /* Track which auto-advance beats have already fired so each
         is triggered only once when its progress threshold is
         crossed forward. Going backward resets the flags. */
      const fired = { adv1: false, adv2: false };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=300%",
          pin: true,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          /* Magnetic snap stops — every phase boundary is a
             stable resting point. Combined with `scrub`, the
             user feels the section "click" at each beat. */
          snap: {
            snapTo: (value) => {
              const stops = [0, 0.45, 0.75, 1];
              return stops.reduce((prev, cur) =>
                Math.abs(cur - value) < Math.abs(prev - value) ? cur : prev
              );
            },
            duration: { min: 0.25, max: 0.7 },
            delay: 0.08,
            ease: "power3.inOut",
          },
          /* Threshold-crossing trigger for the two scripted slide
             advances. Each one fires exactly once per direction
             so the cover-flip and the auto-cycle never compete. */
          onUpdate: (self) => {
            const p = self.progress;
            if (p > 0.5 && !fired.adv1) {
              fired.adv1 = true;
              navigate(1);
            }
            if (p > 0.8 && !fired.adv2) {
              fired.adv2 = true;
              navigate(2);
            }
            if (p < 0.45) {
              fired.adv1 = false;
              fired.adv2 = false;
              if (currentRef.current !== 0) navigate(0);
            } else if (p < 0.75 && fired.adv2) {
              fired.adv2 = false;
              if (currentRef.current > 1) navigate(1);
            }
          },
        },
      });

      /* PHASE 1 (0.00 – 0.38): COVER FLIPS AWAY from the top.
         `rotationX` overshoots past −90° so the cover ends up
         clearly behind the camera plane and the slideshow
         underneath becomes fully readable. The inner content
         lifts a touch and fades a hair early so the user sees
         the wordmark recede before the geometry tilts away. */
      tl.to(
        cover,
        { rotationX: -110, duration: 0.38, ease: "power2.inOut" },
        0
      );
      if (coverInner) {
        tl.to(coverInner, { y: -40, duration: 0.32, ease: "power2.in" }, 0.02);
        tl.to(coverInner, { opacity: 0, duration: 0.18, ease: "power2.in" }, 0.18);
      }
      tl.to(
        cover,
        { opacity: 0, duration: 0.06, ease: "power1.in" },
        0.36
      );

      /* PHASE 2 + 3: nothing on the timeline — the slide
         transitions are owned by the navigate() calls fired
         from `onUpdate` above. Keeping them off the timeline
         lets the parallax wipe play at its own pace without
         being scrubbed backwards by the user. */
    },
    { scope: sectionRef }
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
      ref={sectionRef}
      className="relative h-dvh w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #0A192F 0%, #0d2240 15%, #122a45 50%, #0d2240 85%, #0A192F 100%)",
        /* Perspective + preserve-3d on the section so the cover's
           `rotateX` reads as a real 3D hinge instead of a flat
           y-scale. */
        perspective: "1500px",
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
              className="relative grid place-items-center overflow-hidden will-change-transform"
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
                className="absolute h-full w-full object-cover will-change-transform"
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
        <div className="pointer-events-none absolute inset-x-0 top-[clamp(2.5rem,8vh,7rem)] z-10 flex flex-col items-center px-6 text-center">
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
        className="absolute inset-0 z-30 will-change-transform"
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
          <span
            aria-hidden
            className="absolute bottom-[clamp(1.5rem,5vh,3rem)] flex flex-col items-center gap-2 font-body text-[10px] uppercase tracking-[0.4em] text-sand/40"
          >
            <span>scroll</span>
            <span
              className="block h-6 w-px bg-sand/40"
              style={{ animation: "panoScrollHint 1.6s ease-in-out infinite" }}
            />
          </span>
        </div>
      </div>

      {/* ═══ THUMBNAIL STRIP — bottom, always interactive ═══ */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-[clamp(1.5rem,4vh,3rem)] z-20 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 overflow-hidden rounded-md p-2 md:gap-3">
          {SLIDES.map((slide, i) => (
            <button
              key={i}
              onMouseMove={(e) => onThumbMove(i, e)}
              onMouseLeave={() => onThumbLeave(i)}
              onClick={() => navigate(i)}
              className="relative overflow-hidden rounded transition-all will-change-transform"
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
                className="absolute inset-0 block will-change-transform"
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
        @keyframes panoScrollHint {
          0% { transform: scaleY(0); transform-origin: top; opacity: 0.2; }
          50% { transform: scaleY(1); transform-origin: top; opacity: 0.9; }
          51% { transform: scaleY(1); transform-origin: bottom; }
          100% { transform: scaleY(0); transform-origin: bottom; opacity: 0.2; }
        }
      `}</style>
    </section>
  );
}
