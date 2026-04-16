"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useI18n } from "@/i18n/I18nProvider";
import BeachPanorama from "./BeachPanorama";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   PANORAMA SECTION — "Fly into the O" reveal
   ───────────────────────────────────────────────────────────────
   Layout (clean & predictable, no negative-margin overlap):

     <wrapRef>
       ├── <cardRef>         h-dvh, pinned during the drill scroll
       │     ├── beach photo      (z 0, behind the navy)
       │     ├── navy + mask SVG  (z 1, hole expands over the 'O')
       │     ├── word "Panorama"  (z 2, scales up out of the O)
       │     └── subtitle         (z 2)
       └── <BeachPanorama />  natural-flow sibling, takes over once
                              the title card unpins
     </wrapRef>

   Why the rewrite:
     • The previous version nested BeachPanorama inside this same
       wrapper with `marginTop: -100dvh` so it would peek through
       the hole. That collapsed the wrapper's natural height to
       1 dvh and made both BeachPanorama's autoplay + this
       component's scroll-pin race each other for the same
       viewport. Result: random scroll jumps + the white flash
       the user reported.
     • We also rendered the SVG with a viewBox of 0×0 on the
       first paint (vb state initialised to {0,0}), so the mask
       circle's `r="24"` blew up to 24× the viewBox and cut a
       hole big enough to nuke the entire navy panel — that's
       the white screen.

   Fix:
     • Pin only the title CARD. BeachPanorama lives below as a
       normal sibling, so each pin owns its own scroll range.
     • A real beach photo sits behind the navy. As the mask hole
       expands the user actually flies INTO panorama footage
       rather than into the void.
     • The SVG only mounts once we have measured pixel
       dimensions, so the mask is always sane (no white flash).
     • All scroll work goes through GSAP ScrollTrigger; Lenis
       owns the scroll pacing (no `snap`, no fight).
   ═══════════════════════════════════════════════════════════════ */

const PREVIEW_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80";

export default function PanoramaSection() {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLHeadingElement>(null);
  const measureWordRef = useRef<HTMLHeadingElement>(null);
  const measureORef = useRef<HTMLSpanElement>(null);
  const maskCircleRef = useRef<SVGCircleElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  const heading = t("panorama.heading") || "Panorama";

  /* Split the heading around the FIRST 'o' (any locale) so we can
     wrap that single letter in a span and read its pixel centre.
     Fallback to the middle character if the translation has no 'o'. */
  const { before, oChar, after } = useMemo(() => {
    const match = heading.match(/[oóòôöõ]/i);
    if (match && typeof match.index === "number") {
      return {
        before: heading.slice(0, match.index),
        oChar: heading[match.index],
        after: heading.slice(match.index + 1),
      };
    }
    const mid = Math.max(0, Math.floor(heading.length / 2));
    return {
      before: heading.slice(0, mid),
      oChar: heading[mid] ?? "O",
      after: heading.slice(mid + 1),
    };
  }, [heading]);

  /* viewBox dimensions = real CSS pixels of the card. We DON'T
     render the SVG until both are positive so the mask never
     blows up like it did in the previous build. */
  const [vb, setVb] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        if (width > 0 && height > 0) {
          setVb({ w: Math.round(width), h: Math.round(height) });
        }
      }
    });
    ro.observe(card);
    return () => ro.disconnect();
  }, []);

  useGSAP(
    () => {
      const wrap = wrapRef.current;
      const card = cardRef.current;
      const word = wordRef.current;
      const measureO = measureORef.current;
      const circle = maskCircleRef.current;
      const sub = subRef.current;
      const line = lineRef.current;
      if (!wrap || !card || !word || !measureO || !circle) return;

      /* All metrics come from the static measurement twin, so they
         never drift mid-scrub. */
      const metrics = {
        cx: 0,
        cy: 0,
        rEnd: 5000,
        zoomScale: 30,
      };

      const measure = () => {
        const cardRect = card.getBoundingClientRect();
        const oRect = measureO.getBoundingClientRect();
        if (
          cardRect.width === 0 ||
          cardRect.height === 0 ||
          oRect.width === 0 ||
          oRect.height === 0
        ) {
          return;
        }
        metrics.cx = oRect.left + oRect.width / 2 - cardRect.left;
        metrics.cy = oRect.top + oRect.height / 2 - cardRect.top;
        /* Final radius — must engulf the entire card with a huge
           safety margin so the panorama footage behind is fully
           revealed by the time the pin releases. The brief asks
           for "5000 px or more, expanding across the whole
           section", so we pick max(5000, diag × 3) and never go
           lower regardless of viewport. */
        const diag = Math.hypot(cardRect.width, cardRect.height);
        metrics.rEnd = Math.max(5000, diag * 3);
        /* Word zoom — large enough to push every other letter
           past the card edges (the 'o' stays anchored because
           transform-origin sits on its centre). Tuned so that
           by the time the cut-out begins, the 'o' alone fills
           most of the viewport. */
        const farthest = Math.max(
          metrics.cx,
          cardRect.width - metrics.cx,
          metrics.cy,
          cardRect.height - metrics.cy
        );
        metrics.zoomScale = Math.max(
          22,
          (farthest * 1.6 + oRect.height) / Math.max(12, oRect.height * 0.32)
        );

        /* Snap the resting state to the freshly-measured numbers
           so the very first paint is correct: NO HOLE VISIBLE
           (r = 0). The cut-out only appears once the drill
           timeline runs. */
        circle.setAttribute("cx", String(metrics.cx));
        circle.setAttribute("cy", String(metrics.cy));
        circle.setAttribute("r", "0");
        gsap.set(word, {
          transformOrigin: `${metrics.cx}px ${metrics.cy}px`,
        });
      };

      gsap.set(word, { scale: 1, opacity: 1 });
      if (sub) gsap.set(sub, { opacity: 0, y: 20 });
      if (line) gsap.set(line, { opacity: 0, y: 20 });
      measure();

      /* ─── Entrance — soft scale-in for the wordmark + caption. ─── */
      const entrance = gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: "top 80%",
          once: true,
        },
      });
      entrance.from(word, { scale: 0.9, duration: 0.9, ease: "expo.out" }, 0);
      if (line)
        entrance.to(line, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.3);
      if (sub)
        entrance.to(sub, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.4);

      /* ─── PIN + drill ───
            Pin only the CARD (not the wrapper) so BeachPanorama
            below keeps its own clean scroll range. `scrub: 1`
            follows the user 1-frame-smoothed; no `snap` so Lenis
            stays in sole charge of pacing.
            `end: "+=300%"` gives roughly three viewports of
            scroll inside the pin — long enough for the user to
            feel the 'o' grow before the cut-out begins, and for
            the cut-out itself to expand past every edge. ─── */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: card,
          start: "top top",
          end: "+=300%",
          pin: true,
          pinSpacing: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: measure,
        },
      });

      /* PHASE 1 (0 → 0.08) — magnetic hold. The card is pinned
         and 100% opaque navy; the user sees the word "Panorama"
         intact, NO hole anywhere. Sub-line / divider fade out. */
      tl.to(
        [sub, line],
        { opacity: 0, y: -12, duration: 0.08, ease: "power2.in" },
        0
      );

      /* PHASE 2 (0.08 → 0.50) — ZOOM. The 'o' (and with it the
         whole word, scaled around the o's centre) grows huge.
         The mask circle is still r = 0, so there is STILL no
         hole — the user is reading "Panoramaaaa" zooming into
         their face. */
      tl.to(
        word,
        {
          scale: () => metrics.zoomScale,
          duration: 0.42,
          ease: "power2.inOut",
        },
        0.08
      );

      /* PHASE 3 (0.50 → 0.92) — CARVE. The 'o' becomes the
         window: mask circle expands from 0 to 5000 px+ (or
         3 × the card diagonal, whichever is larger). The
         giant word dissolves at the same time so the user
         flies through the letter into the panorama footage
         underneath. */
      tl.to(
        circle,
        {
          attr: { r: () => metrics.rEnd },
          duration: 0.42,
          ease: "power3.inOut",
        },
        0.50
      );
      tl.to(
        word,
        { opacity: 0, duration: 0.30, ease: "power2.in" },
        0.55
      );

      /* PHASE 4 (0.92 → 1.00) — HOLD on the fully-revealed
         beach. After this the pin releases and normal
         scrolling resumes (BeachPanorama section follows). */

      /* Re-measure after Playfair Display loads — its real metrics
         shift the O slightly. */
      if (typeof document !== "undefined" && document.fonts?.ready) {
        document.fonts.ready.then(() => {
          measure();
          ScrollTrigger.refresh();
        });
      }
    },
    { scope: wrapRef, dependencies: [vb.w, vb.h] }
  );

  /* Identical styling for both the visible word and the invisible
     measurement twin so the O lands on the exact same pixel in
     both copies. */
  const wordStyle: React.CSSProperties = {
    fontSize: "clamp(64px, 17vw, 260px)",
    lineHeight: 1,
    letterSpacing: "-0.04em",
    fontWeight: 500,
    textAlign: "center",
    margin: 0,
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* ── Title card — pinned during the drill ── */}
      <div
        id="panorama"
        ref={cardRef}
        className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden px-4"
        style={{
          background:
            "linear-gradient(180deg, #0A192F 0%, #0d2240 50%, #0A192F 100%)",
          isolation: "isolate",
        }}
      >
        {/* Layer 0 — Beach photo, what the user "flies into" through
            the O. Sits behind the navy panel. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            zIndex: 0,
            backgroundImage: `url(${PREVIEW_IMAGE})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Layer 1 — Navy panel + circular aperture. Only mounts
            once the card has real pixel dimensions; this avoids
            the broken-mask white flash on first paint. */}
        {vb.w > 0 && vb.h > 0 && (
          <svg
            className="absolute inset-0 h-full w-full"
            style={{ zIndex: 1 }}
            viewBox={`0 0 ${vb.w} ${vb.h}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="panoramaNavy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0A192F" />
                <stop offset="30%" stopColor="#0d2240" />
                <stop offset="60%" stopColor="#122a45" />
                <stop offset="85%" stopColor="#0d2240" />
                <stop offset="100%" stopColor="#0A192F" />
              </linearGradient>
              <mask
                id="panoramaAperture"
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width={vb.w}
                height={vb.h}
              >
                <rect width={vb.w} height={vb.h} fill="white" />
                <circle
                  ref={maskCircleRef}
                  cx={vb.w / 2}
                  cy={vb.h / 2}
                  r={0}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width={vb.w}
              height={vb.h}
              fill="url(#panoramaNavy)"
              mask="url(#panoramaAperture)"
            />
          </svg>
        )}

        {/* Layer 2 — Word stack. Two copies share one CSS grid cell
            so the measurement twin sits on exactly the same pixel
            as the visible word. */}
        <div
          className="relative grid w-full place-items-center"
          style={{
            zIndex: 2,
            gridTemplateRows: "1fr",
            gridTemplateColumns: "1fr",
          }}
        >
          <h1
            ref={measureWordRef}
            aria-hidden
            className="select-none font-heading text-white"
            style={{
              ...wordStyle,
              gridArea: "1 / 1",
              opacity: 0,
              pointerEvents: "none",
              visibility: "hidden",
            }}
          >
            {before}
            <span ref={measureORef}>{oChar}</span>
            {after}
          </h1>

          <h1
            ref={wordRef}
            className="select-none font-heading text-white"
            style={{
              ...wordStyle,
              gridArea: "1 / 1",
              willChange: "transform, opacity",
              textShadow: "0 4px 30px rgba(0, 0, 0, 0.45)",
            }}
          >
            {heading}
          </h1>
        </div>

        {/* Subtitle + hairline beneath the wordmark. */}
        <div
          className="pointer-events-none relative mt-8 flex flex-col items-center gap-3 px-6 text-center sm:mt-10 md:mt-12"
          style={{ zIndex: 2 }}
        >
          <div
            ref={lineRef}
            className="h-px w-[min(60vw,400px)] bg-linear-to-r from-transparent via-sand/30 to-transparent"
          />
          <p
            ref={subRef}
            className="max-w-md font-body text-sm text-sand/55 sm:text-base md:text-lg"
          >
            {t("panorama.label")}
          </p>
        </div>
      </div>

      {/* ── BeachPanorama — natural-flow sibling. Takes over the
            viewport once the title card unpins. ── */}
      <BeachPanorama />
    </div>
  );
}
