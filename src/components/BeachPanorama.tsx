"use client";

import { useRef, useState, useCallback, type MouseEvent } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   BEACH PANORAMA — Osmo Crisp-style loading + slideshow
   ─────────────────────────────────────────────────────────────
   Architecture (from Osmo supply):
   1. Filmstrip loader: dual groups (duplicate + relative)
      scroll across, center scales to fullscreen
   2. Parallax-wipe slideshow with thumbnail nav
   3. "Nasza Panorama" title reveal
   4. Pinned during intro → released after fullscreen
   ═══════════════════════════════════════════════════════════════ */

const SLIDES = [
  { src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80", title: "Turkusowa Laguna", subtitle: "Krystalicznie czysta woda i biały piasek" },
  { src: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1920&q=80", title: "Złoty Zachód", subtitle: "Magiczne kolory zachodzącego słońca" },
  { src: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=1920&q=80", title: "Spokojne Fale", subtitle: "Relaks przy dźwięku morza" },
  { src: "https://images.unsplash.com/photo-1520942702018-0862200e6873?w=1920&q=80", title: "Palmowy Raj", subtitle: "Cień palm i ciepły piasek" },
  { src: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=1920&q=80", title: "Morska Głębia", subtitle: "Nurkowanie w lazurowej wodzie" },
];

const WIPE_DUR = 1.5;
const CENTER_IDX = 2;

export default function BeachPanorama() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const [current, setCurrent] = useState(0);
  const animatingRef = useRef(false);
  const slideEls = useRef<(HTMLDivElement | null)[]>([]);
  const innerEls = useRef<(HTMLImageElement | null)[]>([]);
  const thumbInnerEls = useRef<(HTMLSpanElement | null)[]>([]);

  /* ── Osmo-style filmstrip intro — pinned ── */
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const loader = section.querySelector("[data-crisp-loader]") as HTMLElement;
      if (!loader) return;

      const revealImages = loader.querySelectorAll("[data-crisp-single]");
      const scaleDownImgs = loader.querySelectorAll("[data-scale-down]");
      const scalingMedia = loader.querySelector("[data-scaling]") as HTMLElement;
      const radiusEl = loader.querySelector("[data-radius]") as HTMLElement;
      const smallEls = section.querySelectorAll("[data-small]");
      const thumbEls = section.querySelectorAll("[data-thumb]");

      // Initial states
      gsap.set(smallEls, { opacity: 0 });
      gsap.set(thumbEls, { yPercent: 150 });

      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: "expo.inOut" },
      });

      // Auto-play when bottom of viewport reaches section
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        once: true,
        onEnter: () => tl.play(),
      });

      /* Filmstrip scroll */
      if (revealImages.length) {
        tl.fromTo(
          revealImages,
          { xPercent: 500 },
          { xPercent: -500, duration: 2.5, stagger: 0.05 },
          0
        );
      }

      /* Scale down non-center images */
      if (scaleDownImgs.length) {
        tl.to(scaleDownImgs, {
          scale: 0.5,
          duration: 1.5,
          stagger: { each: 0.05, from: "edges", ease: "none" },
          onComplete: () => {
            if (radiusEl) radiusEl.style.borderRadius = "0";
          },
        }, 1.0);
      }

      /* Center image scales to fullscreen */
      if (scalingMedia) {
        tl.fromTo(
          scalingMedia,
          { width: "10em", height: "10em" },
          { width: "100vw", height: "100dvh", duration: 1.8 },
          1.5
        );
      }

      /* Thumbnails rise */
      if (thumbEls.length) {
        tl.to(thumbEls, {
          yPercent: 0,
          stagger: 0.08,
          ease: "expo.out",
          duration: 0.8,
        }, 3.0);
      }

      /* Heading letters — Osmo-style letter-by-letter reveal */
      const headingLetters = section.querySelectorAll("[data-heading-letter]");
      const headingWrap = section.querySelector("[data-heading-wrap]") as HTMLElement;

      if (headingLetters.length) {
        gsap.set(headingLetters, { yPercent: 120 });
        tl.to(headingLetters, {
          yPercent: 0,
          stagger: 0.075,
          ease: "expo.out",
          duration: 1,
        }, 2.8);
      }

      /* Shrink heading from large to normal (Osmo scale effect) */
      if (headingWrap) {
        gsap.set(headingWrap, { scale: 2.5 });
        tl.to(headingWrap, {
          scale: 1,
          ease: "expo.inOut",
          duration: 1.4,
        }, 3.0);
      }

      /* Title words reveal — now handled by data-heading-letter above */

      /* Small elements fade in */
      if (smallEls.length) {
        tl.to(smallEls, {
          opacity: 1,
          ease: "power1.inOut",
          duration: 0.6,
        }, 3.8);
      }

      /* Hide loader */
      tl.call(() => {
        loader.style.display = "none";
      }, undefined, 4.0);
    },
    { scope: sectionRef }
  );

  /* ── Slideshow navigation (Osmo parallax wipe) ── */
  const navigate = useCallback(
    (targetIndex: number) => {
      if (animatingRef.current || targetIndex === current) return;
      animatingRef.current = true;

      const dir = targetIndex > current ? 1 : -1;
      const curSlide = slideEls.current[current];
      const curInner = innerEls.current[current];
      const nextSlide = slideEls.current[targetIndex];
      const nextInner = innerEls.current[targetIndex];

      if (!curSlide || !nextSlide) { animatingRef.current = false; return; }

      gsap.timeline({
        defaults: { duration: WIPE_DUR, ease: "expo.inOut" },
        onStart: () => {
          nextSlide.style.opacity = "1";
          nextSlide.style.pointerEvents = "auto";
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
    },
    [current]
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
      className="relative flex h-dvh items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0A192F 0%, #0d2240 15%, #122a45 50%, #0d2240 85%, #0A192F 100%)" }}
    >
      {/* ═══ SLIDER (behind loader) ═══ */}
      <div className="absolute inset-0">
        <div
          className="grid h-full w-full"
          style={{ gridTemplateRows: "100%", gridTemplateColumns: "100%" }}
        >
          {SLIDES.map((slide, i) => (
            <div
              key={i}
              ref={(el) => { slideEls.current[i] = el; }}
              className="relative grid place-items-center overflow-hidden will-change-transform"
              style={{
                gridArea: "1 / 1 / -1 / -1",
                opacity: i === 0 ? 1 : 0,
                pointerEvents: i === 0 ? "auto" : "none",
              }}
            >
              <img
                ref={(el) => { innerEls.current[i] = el; }}
                src={slide.src}
                alt={slide.title}
                loading={i < 2 ? "eager" : "lazy"}
                draggable={false}
                className="absolute h-full w-full object-cover will-change-transform"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CRISP LOADER (Osmo-style filmstrip) ═══ */}
      <div
        data-crisp-loader
        className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
        style={{ fontSize: "clamp(8px, 1.5vw, 12px)", background: "linear-gradient(180deg, #0A192F 0%, #0d2240 30%, #122a45 50%, #0d2240 70%, #0A192F 100%)" }}
      >
        <div className="relative flex items-center justify-center">
          <div className="relative overflow-hidden rounded-[0.5em]">
            {/* ── Duplicate group (absolute, behind) ── */}
            <div className="absolute flex items-center justify-center rounded-[0.5em]">
              {SLIDES.map((slide, i) => (
                <div key={`dup-${i}`} data-crisp-single className="relative px-[1em]">
                  <div
                    className="flex items-center justify-center overflow-hidden rounded-[0.5em]"
                    style={{ width: "10em", height: "10em" }}
                  >
                    <img
                      src={slide.src}
                      alt={slide.title}
                      loading="eager"
                      className="absolute h-full w-full rounded-[inherit] object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Relative group (scrolls, center scales up) ── */}
            <div
              className="relative flex items-center justify-center rounded-[0.5em]"
              style={{ left: "100%" }}
            >
              {SLIDES.map((slide, i) => (
                <div key={`rel-${i}`} data-crisp-single className="relative px-[1em]">
                  <div
                    {...(i === CENTER_IDX
                      ? { "data-scaling": true, "data-radius": true }
                      : {})}
                    className="flex items-center justify-center overflow-hidden rounded-[0.5em]"
                    style={{
                      width: "10em",
                      height: "10em",
                      willChange: i === CENTER_IDX ? "transform" : undefined,
                      transition: i === CENTER_IDX ? "border-radius 0.5s cubic-bezier(1,0,0,1)" : undefined,
                    }}
                  >
                    <img
                      src={slide.src}
                      alt={slide.title}
                      loading="eager"
                      {...(i !== CENTER_IDX ? { "data-scale-down": true } : {})}
                      className="absolute h-full w-full rounded-[inherit] object-cover"
                      style={{ willChange: i !== CENTER_IDX ? "transform" : undefined }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fade edges */}
          <div
            className="pointer-events-none absolute -left-px -top-px h-[calc(100%+2px)]"
            style={{ width: "5em", background: "linear-gradient(90deg, var(--color-navy) 20%, transparent)" }}
          />
          <div
            className="pointer-events-none absolute -right-px -top-px h-[calc(100%+2px)]"
            style={{ width: "5em", background: "linear-gradient(-90deg, var(--color-navy) 20%, transparent)" }}
          />
        </div>
      </div>

      {/* ═══ CONTENT OVERLAY ═══ */}
      <div className="pointer-events-none relative z-20 flex h-dvh w-full flex-col items-center justify-between px-6 py-8 text-sand md:px-10 md:py-12">
        {/* Top spacer (heading is now external, above this component) */}
        <div className="pt-2" />

        {/* Center — big title (Osmo-style: letter-by-letter reveal + scale down) */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center">
          <div data-heading-wrap className="will-change-transform">
            <h1
              className="font-heading text-sand"
              style={{
                fontSize: "clamp(2rem, calc(5vw + 5dvh), 8rem)",
                fontWeight: 400,
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
              }}
            >
              {t("panorama.heading").split("").map((char, i) => (
                <span key={i} className="inline-block overflow-hidden">
                  <span
                    data-heading-letter
                    className="inline-block will-change-transform"
                    style={{ padding: "0.1em 0.05em", margin: "-0.1em -0.05em" }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </span>
                </span>
              ))}
            </h1>
          </div>
          <p data-small className="mx-auto mt-3 max-w-md font-body text-base text-sand/60 md:text-lg">
            {SLIDES[current].subtitle}
          </p>
        </div>

        {/* Bottom — thumbnail nav */}
        <div className="mt-auto flex flex-col items-center gap-4 pointer-events-auto">
          <div className="flex items-center gap-2 overflow-hidden rounded-md p-2 md:gap-3">
            {SLIDES.map((slide, i) => (
              <button
                key={i}
                data-thumb
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
                <span ref={(el) => { thumbInnerEls.current[i] = el; }} className="absolute inset-0 block will-change-transform">
                  <img
                    src={slide.src}
                    alt={slide.title}
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
          <p data-small className="font-body text-center text-sm text-sand/50">
            {SLIDES[current].title}
          </p>
        </div>
      </div>
    </section>
  );
}
