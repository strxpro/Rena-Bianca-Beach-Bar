"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PinContainer } from "@/components/ui/3d-pin";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   LOCATION ↔ CONTACT  —  Orbital Scroll Transition
   ─────────────────────────────────────────────────────────────
   Scroll-driven cinematic sequence:

   Phase 0: Location visible immediately (no empty space).
   Phase 1 (0→0.12): Location content lifts up.
            Waves rise from bottom (back first, front with delay).
            Frame-animation canvas rises from bottom between waves.
   Phase 2 (0.12→0.35): Frame animation plays (slow start → normal).
            Background shifts navy → blue.
   Phase 3 (0.35→0.55): Location orbits LEFT (curved arc).
            Contact enters from RIGHT.
   Phase 4 (0.55→0.75): Hold — user reads Contact.
   Phase 5 (0.75→0.88): Exit for footer.
   ═══════════════════════════════════════════════════════════════ */

const TOTAL_FRAMES = 150;
const FRAME_PAD = 5; // WYSPA00000 format

const MAPS_HREF =
  "https://www.google.com/maps/place/Rena+Bianca+beach+bar/@41.2443727,9.1873002,17z";

function getFrameSrc(i: number) {
  return `/wyspa/WYSPA${String(i).padStart(FRAME_PAD, "0")}.png`;
}

// Custom easing for slow-start frames: first 30% of frames play in 60% of the timeline
function slowStartMap(progress: number): number {
  if (progress < 0.6) {
    // First 60% of scroll → first 30% of frames (slow)
    return (progress / 0.6) * 0.3;
  }
  // Remaining 40% of scroll → last 70% of frames (fast)
  return 0.3 + ((progress - 0.6) / 0.4) * 0.7;
}

export default function LocationContactTransition() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameIdxRef = useRef({ value: 0 });
  // Auto-activates the 3D PinContainer while the location panel is
  // orbiting out of view — "tu jesteśmy" label + cyan pin appear by
  // themselves, no hover needed. Ref avoids re-renders; state lets
  // React propagate to <PinContainer forceActive=...>.
  const pinActiveRef = useRef(false);
  const [pinActive, setPinActive] = useState(false);

  /* ── Lazy, staggered frame preloader ─────────────────────────
        The section uses 150 WYSPA PNGs (~100 MB total). Loading
        them all on first paint would slaughter mobile bandwidth
        and the LCP score — so instead:
          1. Allocate empty Image objects up-front (cheap, no net).
          2. Always fetch frame 0 immediately so the canvas has
             something to paint the moment the user reaches the
             section (avoids a white flash).
          3. Hold off the rest until an IntersectionObserver says
             the section is within ~2 viewports of the screen.
             Then stream the frames in small parallel batches so
             the connection doesn't get saturated.
        Net effect: landing page transfer drops by ~100 MB, and
        the frame sequence is always ready by the time the
        scroll-driven timeline actually reaches it. ── */
  useEffect(() => {
    const imgs: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      imgs[i] = new Image();
      imgs[i].decoding = "async";
    }
    imagesRef.current = imgs;

    // Always fetch frame 0 now so the first paint of the section
    // isn't blank — it's a single ~430 KB image, negligible cost.
    imgs[0].src = getFrameSrc(0);
    imgs[0].onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = imgs[0].naturalWidth;
      canvas.height = imgs[0].naturalHeight;
      ctx.drawImage(imgs[0], 0, 0);
    };

    let cancelled = false;
    let started = false;
    // Streams the remaining frames in batches so we don't fire
    // 149 parallel requests at once (which can overwhelm mobile
    // HTTP/1.1 connections and stall the main image for seconds).
    const startStreaming = () => {
      if (started || cancelled) return;
      started = true;
      const BATCH = 8;
      let next = 1;
      const pump = () => {
        if (cancelled) return;
        let inFlight = 0;
        const end = Math.min(next + BATCH, TOTAL_FRAMES);
        for (let i = next; i < end; i++) {
          const img = imgs[i];
          if (!img.src) {
            inFlight++;
            const onDone = () => {
              inFlight--;
              if (inFlight === 0) pump();
            };
            img.onload = onDone;
            img.onerror = onDone;
            img.src = getFrameSrc(i);
          }
        }
        next = end;
        if (inFlight === 0 && next < TOTAL_FRAMES) pump();
      };
      pump();
    };

    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") {
      startStreaming();
      return () => { cancelled = true; };
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            startStreaming();
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200% 0px 200% 0px" }
    );
    io.observe(section);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, []);

  const drawFrame = useCallback((idx: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[idx];
    if (!canvas || !img || !img.complete) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvas.width !== img.naturalWidth) canvas.width = img.naturalWidth;
    if (canvas.height !== img.naturalHeight) canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }, []);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const waveBack = section.querySelector("[data-wave-back]") as HTMLElement;
      const waveFront = section.querySelector("[data-wave-front]") as HTMLElement;
      const framePlayer = section.querySelector("[data-frame-player]") as HTMLElement;
      const sceneWrap = section.querySelector("[data-location-scene]") as HTMLElement;
      const locationPanel = section.querySelector("[data-location]") as HTMLElement;
      const contactPanel = section.querySelector("[data-contact]") as HTMLElement;
      const headingLetters = section.querySelectorAll("[data-h-letter]");
      const formEls = section.querySelectorAll("[data-form-el]");
      /* "Sentence-by-sentence" reveal targets. Every logical line
         of the contact panel (eyebrow → heading → description →
         form name/email → message → submit) carries this data-attr
         so we can stagger them in after the panel lands at centre,
         brightening as they slide into place. */
      const contactLines = section.querySelectorAll("[data-contact-line]");
      const bgEl = section.querySelector("[data-bg]") as HTMLElement;

      if (!waveBack || !waveFront || !framePlayer || !sceneWrap || !locationPanel || !contactPanel) return;

      /* ═══════════════════════════════════════════════════════════════
         TIMELINE MAP (scroll progress 0 → 1)

         0.00 – 0.08   Waves rise: back wave first, front with delay
         0.08 – 0.18   Film rises between waves, first ~12% of frames
                       already playing (never shows a frozen poster)
         0.18 – 0.42   Film plays first half with slow-start ease-in/out
         0.42 – 0.62   MIDPOINT OF FILM ⇒ orbit swap starts
                       • Location panel curves OFF-SCREEN LEFT (moon
                         exits its sector) — rotation capped at −25°
                         so the panel never flips upside-down.
                       • Contact panel swings IN from the right along
                         a curved path, simultaneous with location's
                         departure.
                       • Film keeps playing to its last frame here.
         0.62 – 0.72   Contact fully visible, user reads. Film still
                       on its final frame, sitting centred.
         0.72 – 0.78   FILM slides down & off (Earth retreats).
         0.78 – 0.84   FRONT WAVE slides down & off.
         0.84 – 0.90   BACK WAVE slides down & off.
         0.90 – 1.00   Contact holds, then gently lifts for footer.
         ═══════════════════════════════════════════════════════════════ */

      // Initial states — location VISIBLE, waves + frame below screen, bg static
      // NOTE: transform-origin on sceneWrap kept as "center" so any tiny
      // tween never introduces a visual flip. No rotation is ever applied
      // to this wrap (waves + film stay perfectly upright).
      gsap.set(sceneWrap, { yPercent: 0, xPercent: 0, rotation: 0, transformOrigin: "center center" });
      // Waves start fully hidden BELOW the viewport so the very
      // first pixel of the section shows only the dark gradient
      // + location panel — no waves visible until they rise in
      // during Phase 1.
      gsap.set(waveBack, { yPercent: 130 });
      gsap.set(waveFront, { yPercent: 140 });
      gsap.set(framePlayer, { yPercent: 130 });
      // Location panel pivots from its own centre so the orbit curves
      // around its middle instead of one edge (fixes the old "flip"
      // feel caused by transform-origin: left center).
      gsap.set(locationPanel, {
        opacity: 1,
        yPercent: 0,
        xPercent: 0,
        scale: 1,
        rotation: 0,
        transformOrigin: "50% 50%",
      });
      gsap.set(contactPanel, { xPercent: 120, yPercent: 0, opacity: 0, rotation: 0, transformOrigin: "50% 50%" });
      gsap.set(headingLetters, { yPercent: 120 });
      /* All sentence blocks start DIM, slightly pushed down, and
         softly blurred — they'll snap into sharp, fully-bright
         focus one at a time in Phase 5b below. This also
         supersedes the previous formEls init (formEls is a
         subset of contactLines) so we keep a single source of
         truth for the reveal baseline. */
      gsap.set(contactLines, {
        opacity: 0,
        y: 26,
        filter: "blur(8px) brightness(0.45) saturate(0.7)",
      });
      gsap.set(formEls, { opacity: 0, y: 30 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=600%",
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          onUpdate: (self) => {
            // Auto-activate the 3D pin while the panel is orbiting away.
            const p = self.progress;
            const shouldActivate = p > 0.18 && p < 0.50;
            if (shouldActivate !== pinActiveRef.current) {
              pinActiveRef.current = shouldActivate;
              setPinActive(shouldActivate);
            }
          },
        },
      });

      /* ═══ Phase 1 (0.02 → 0.12): Waves rise — back first, then front.
            Start AFTER a tiny delay so the first scroll shows ONLY
            the dark gradient + location panel (no waves yet). ═══ */
      tl.to(waveBack, { yPercent: 55, duration: 0.08, ease: "power2.out" }, 0.02);
      tl.to(waveFront, { yPercent: 60, duration: 0.08, ease: "power2.out" }, 0.04);

      /* ═══ Phase 2 (0.10 → 0.18): Film rises between waves.
            First ~12% of frames already play so the canvas is
            alive the moment it peeks above the water line. ═══ */
      tl.to(framePlayer, { yPercent: 0, duration: 0.10, ease: "power2.out" }, 0.10);

      const PHASE2_END_FRAME = Math.round((TOTAL_FRAMES - 1) * 0.12);
      tl.to(frameIdxRef.current, {
        value: PHASE2_END_FRAME,
        duration: 0.10,
        ease: "power1.out",
        onUpdate: () => {
          const idx = Math.round(frameIdxRef.current.value);
          drawFrame(Math.min(idx, TOTAL_FRAMES - 1));
        },
      }, 0.08);

      /* ═══ Phase 3 (0.18 → 0.66): Film plays in two segments so
            the orbital swap lines up exactly with the last 22
            frames of the canvas film, as the user asked for:

              Segment A (FILM_START → ORBIT_START):
                 frames PHASE2_END_FRAME (~18) → 128
                 Cinematic slow-start ease so the intro has
                 anticipation.

              Segment B (ORBIT_START → FILM_END):
                 frames 128 → 149
                 Linear. This 22-frame stretch runs at exactly
                 the same scroll speed as the contact-enter
                 animation, so frame 128 = contact-starts-to-
                 appear and frame 150 = contact-fully-centred.
            ═══ */
      const FILM_START = 0.18;
      const ORBIT_START = 0.48;
      const ORBIT_DUR = 0.18;
      const FILM_END = ORBIT_START + ORBIT_DUR; // 0.66
      const FRAME_AT_ORBIT_START = 128;
      const LAST_FRAME = TOTAL_FRAMES - 1;

      // Segment A — frames ~18 → 128 with slow-start curve.
      tl.to(frameIdxRef.current, {
        value: FRAME_AT_ORBIT_START,
        duration: ORBIT_START - FILM_START,
        ease: "none",
        onUpdate: () => {
          const rawProgress = tl.progress();
          const segP = Math.max(
            0,
            Math.min(1, (rawProgress - FILM_START) / (ORBIT_START - FILM_START))
          );
          const mapped = slowStartMap(segP);
          const frame =
            PHASE2_END_FRAME +
            Math.round(mapped * (FRAME_AT_ORBIT_START - PHASE2_END_FRAME));
          drawFrame(Math.min(frame, LAST_FRAME));
        },
      }, FILM_START);

      // Segment B — frames 128 → 149, tightly synced to the orbit.
      tl.to(frameIdxRef.current, {
        value: LAST_FRAME,
        duration: ORBIT_DUR,
        ease: "none",
        onUpdate: () => {
          const rawProgress = tl.progress();
          const segP = Math.max(
            0,
            Math.min(1, (rawProgress - ORBIT_START) / ORBIT_DUR)
          );
          const frame =
            FRAME_AT_ORBIT_START +
            Math.round(segP * (LAST_FRAME - FRAME_AT_ORBIT_START));
          drawFrame(Math.min(frame, LAST_FRAME));
        },
      }, ORBIT_START);

      /* ── Background gradually lightens during the film play ── */
      if (bgEl) {
        tl.to(bgEl, {
          background: "linear-gradient(180deg, #1a3a5c 0%, #2a7ab8 40%, #5ba3d9 75%, #8ec5e8 100%)",
          duration: 0.28,
          ease: "power1.inOut",
        }, 0.18);
      }

      /* ═══ Phase 4 (ORBIT_START → FILM_END): SYNCHRONIZED ORBIT SWAP
            Location orbits out to the LEFT while the Contact panel
            ENTERS FROM THE RIGHT in the **same scroll window**, and
            the canvas film plays its last 22 frames at the same time
            (Segment B above). Contact starts peeking in at frame 128
            and reaches its magnetic-centred position at frame 150.
            ORBIT_START / ORBIT_DUR are declared at the top of this
            useGSAP scope so both the film segments and the panel
            keyframes share identical timing. ═══ */

      // LOCATION: orbit out to the LEFT. The path curves UP first
      // (−y), then sweeps down and off-screen (+y). `sine.inOut`
      // between keyframes gives the arc a genuine circular feel.
      tl.to(locationPanel, {
        keyframes: [
          { xPercent: -20, yPercent: -8,  rotation: -8,  scale: 0.94, opacity: 0.92, duration: 0.22, ease: "sine.inOut" },
          { xPercent: -60, yPercent: -14, rotation: -18, scale: 0.82, opacity: 0.55, duration: 0.28, ease: "sine.inOut" },
          { xPercent: -110, yPercent: -6, rotation: -24, scale: 0.66, opacity: 0.2,  duration: 0.25, ease: "sine.inOut" },
          { xPercent: -160, yPercent: 8,  rotation: -25, scale: 0.5,  opacity: 0,    duration: 0.25, ease: "power1.in" },
        ],
        duration: ORBIT_DUR,
      }, ORBIT_START);

      /* CONTACT: one continuous flight from off-right → across the
         viewport → small overshoot past centre toward the LEFT →
         magnetic snap-back → settle exactly at x=0.

         Keyframe durations are fractions of the ORBIT_DUR window
         (they must sum to 1.0):
           0.00–0.35 — enter, travel to ~50% (approaching centre)
           0.35–0.60 — cross centre, fly to ~-8% (LEFT of centre)
                       → this is the "on the left" moment the user
                       asked for; magnetic lock ENGAGES here with
                       a tiny scale bloom (1.02).
           0.60–0.85 — gentle pull back to +1.5% with a micro
                       rebound in scale (the delicate magnet tug).
           0.85–1.00 — final settle to dead centre at scale 1.
      */
      tl.set(contactPanel, { opacity: 0, xPercent: 120, yPercent: 0, rotation: 8, scale: 1 }, ORBIT_START);
      tl.to(contactPanel, {
        keyframes: [
          { xPercent: 85, yPercent: -4, rotation: 6, opacity: 0.45, duration: 0.18, ease: "sine.inOut" },
          { xPercent: 50, yPercent: -2, rotation: 3, opacity: 0.85, duration: 0.17, ease: "sine.inOut" },
          /* Magnetic LOCK engages: panel crosses centre and is
             pulled by an invisible magnet a few percent LEFT of
             centre with a tiny scale bloom. */
          { xPercent: -8, yPercent: -0.6, rotation: 0, opacity: 1, scale: 1.02, duration: 0.25, ease: "power3.out" },
          /* Gentle settle — the magnet lets go. Micro-rebound in
             scale so it doesn't feel like a hard snap. */
          { xPercent: 1.5, yPercent: 0, scale: 0.996, duration: 0.25, ease: "sine.inOut" },
          { xPercent: 0, yPercent: 0, scale: 1, duration: 0.15, ease: "power2.out" },
        ],
        duration: ORBIT_DUR,
      }, ORBIT_START);

      /* ═══ Phase 5 (0.66 → 0.78): Scenery hides DOWN.
            Only AFTER the contact panel has locked to centre do the
            film player and waves retreat below the viewport, so the
            contact card owns the screen for the rest of the section. ═══ */
      const SCENERY_EXIT = ORBIT_START + ORBIT_DUR;        // 0.66
      tl.to(framePlayer, { yPercent: 130, duration: 0.06, ease: "power2.in" }, SCENERY_EXIT);
      tl.to(waveFront,   { yPercent: 140, duration: 0.06, ease: "power2.in" }, SCENERY_EXIT + 0.03);
      tl.to(waveBack,    { yPercent: 130, duration: 0.06, ease: "power2.in" }, SCENERY_EXIT + 0.06);

      /* ═══ Phase 5b (0.70 → 0.88): SENTENCE-BY-SENTENCE REVEAL.
            Once the contact panel is centred, each line of copy
            slides up into its final position while its filter
            animates from `blur(8px) brightness(0.45)` to crisp
            `blur(0) brightness(1)` — the "becomes brighter, more
            vivid, one sentence at a time" beat. The stagger is
            sized so the last line (submit button) finishes well
            before the panel lifts for the footer. ═══ */
      /* Cascade starts the moment the magnetic lock releases
         (ORBIT_START + ORBIT_DUR = 0.66) so the sentences brighten
         in as the scenery is sliding down — one continuous beat
         instead of two separate ones. */
      const LINE_REVEAL_START = ORBIT_START + ORBIT_DUR + 0.02; // ≈ 0.68
      const LINE_REVEAL_DUR = 0.06;
      const LINE_STAGGER = 0.025;

      // Snap the sync'd form-el init out of the way so the cascade
      // owns their opacity/y. (formEls's initial gsap.set above is
      // kept as an extra safety net in case older markup is ever
      // used without `data-contact-line`.)
      tl.to(
        formEls,
        { opacity: 1, y: 0, duration: 0.001, ease: "none" },
        LINE_REVEAL_START
      );

      // The actual cascade.
      tl.to(
        contactLines,
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px) brightness(1) saturate(1)",
          stagger: LINE_STAGGER,
          duration: LINE_REVEAL_DUR,
          ease: "power2.out",
        },
        LINE_REVEAL_START
      );

      // Heading letters still rise letter-by-letter, but now
      // timed to coincide with the heading's turn in the cascade
      // (it's the SECOND data-contact-line, so start one
      // stagger-beat after the eyebrow).
      tl.to(
        headingLetters,
        {
          yPercent: 0,
          stagger: 0.006,
          duration: 0.08,
          ease: "expo.out",
        },
        LINE_REVEAL_START + LINE_STAGGER
      );

      /* ═══ Phase 6 (0.72 → 1.00): HOLD — user reads Contact and
            it STAYS THERE.
            Background stays BLUE (the gradient that turned blue
            during "Znajdź nas" carries into Contact and does
            NOT revert to dark navy).
            Per the brief, once the contact card has reached its
            final position we no longer animate it out — further
            scrolling simply parks the section on the last frame
            so the user can keep reading what's on the screen. ═══ */
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative h-dvh w-full overflow-hidden"
      style={{ background: "#0A192F" }}
    >
      <div id="reservation" className="pointer-events-none absolute left-0 top-0 h-px w-px" />

      {/* Background layer for color animation */}
      <div data-bg className="absolute inset-0" style={{ background: "#0A192F" }} />

      <div data-location-scene className="absolute inset-0 will-change-transform">
      {/* ═══ BACK WAVE (taller, behind) ═══ */}
      <div
        data-wave-back
        className="pointer-events-none absolute inset-x-0 bottom-0 z-2 will-change-transform"
        style={{ height: "25%" }}
      >
        <svg
          viewBox="0 24 150 28"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 h-20 w-full -translate-y-full"
        >
          <defs>
            <path id="lct-wave-back" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
          </defs>
          <g className="lct-wave-back-g">
            <use xlinkHref="#lct-wave-back" x="48" y="0" fill="rgba(26,74,110,0.4)" />
            <use xlinkHref="#lct-wave-back" x="48" y="3" fill="rgba(26,74,110,0.6)" />
            <use xlinkHref="#lct-wave-back" x="48" y="5" fill="rgba(26,74,110,0.85)" />
            <use xlinkHref="#lct-wave-back" x="48" y="7" fill="#1a4a6e" />
          </g>
        </svg>
        <div className="h-full w-full" style={{ background: "linear-gradient(180deg, #1a4a6e 0%, #0d2240 100%)" }} />
      </div>

      {/* ═══ FRAME PLAYER — 1920×1080 original ratio, rises from below waves.
              Anchored high in the viewport on every breakpoint so the
              frame sits ABOVE the waves and well clear of any bottom
              overlays (user explicitly asked for it to sit higher like
              it did originally). ═══ */}
      <div
        data-frame-player
        className="absolute inset-x-0 z-3 top-[clamp(2rem,6vh,4rem)] overflow-hidden will-change-transform md:top-[clamp(1rem,4vw,3rem)]"
        style={{
          width: "100%",
          aspectRatio: "1920/1080",
        }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full object-cover"
        />
      </div>

      {/* ═══ FRONT WAVE (shorter, in front of frame player) ═══ */}
      <div
        data-wave-front
        className="pointer-events-none absolute inset-x-0 bottom-0 z-4 will-change-transform"
        style={{ height: "18%" }}
      >
        <svg
          viewBox="0 24 150 28"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 h-16 w-full -translate-y-full"
        >
          <defs>
            <path id="lct-wave-front" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
          </defs>
          <g className="lct-wave-front-g">
            <use xlinkHref="#lct-wave-front" x="48" y="0" fill="rgba(59,130,196,0.3)" />
            <use xlinkHref="#lct-wave-front" x="48" y="3" fill="rgba(59,130,196,0.5)" />
            <use xlinkHref="#lct-wave-front" x="48" y="5" fill="rgba(59,130,196,0.75)" />
            <use xlinkHref="#lct-wave-front" x="48" y="7" fill="#3B82C4" />
          </g>
        </svg>
        <div className="h-full w-full" style={{ background: "linear-gradient(180deg, #3B82C4 0%, #1a4a6e 60%, #0d2240 100%)" }} />
      </div>

      {/* ═══ LOCATION PANEL — visible immediately. Pivots from centre
           so the orbital exit curves around the panel's middle. ═══ */}
      <div
        data-location
        className="absolute inset-0 z-10 flex items-center justify-center will-change-transform"
      >
        <div className="mx-auto w-full max-w-5xl px-6 sm:px-10">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
            {/* Left: heading + info */}
            <div>
              <span className="mb-3 block font-body text-xs uppercase tracking-[0.3em] text-sand/40">
                {t("location.label")}
              </span>
              <h2
                className="font-heading text-3xl text-sand sm:text-4xl md:text-5xl lg:text-6xl"
                style={{ fontWeight: 400 }}
              >
                {t("location.heading")}
              </h2>

              <div className="mt-8 space-y-5 font-body text-sm leading-relaxed text-sand/60 sm:text-base">
                <div>
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">{t("location.address.label")}</span>
                  <p>
                    Spiaggia di Rena Bianca<br />
                    07028 Santa Teresa Gallura<br />
                    {t("location.country")}
                  </p>
                </div>

                <div className="h-px w-16" style={{ background: "linear-gradient(90deg, rgba(59,130,196,0.3), transparent)" }} />

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">{t("location.hours.label")}</span>
                    <p>{t("location.hours.value")}<br />10:00 – 01:00</p>
                  </div>
                  <div>
                    <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">{t("location.phone.label")}</span>
                    <p>
                      +39 0789 123 456<br />
                      kontakt@renabianca.it
                    </p>
                  </div>
                </div>
              </div>

              <a
                href={MAPS_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex w-fit items-center gap-2.5 rounded-full border border-ocean/30 bg-ocean/10 px-6 py-3 font-body text-xs font-medium uppercase tracking-wider text-sand/80 transition-all duration-300 hover:border-ocean/50 hover:bg-ocean/20 hover:text-sand sm:text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1C4.79 1 3 2.79 3 5c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4zm0 5.5A1.5 1.5 0 1 1 7 3.5a1.5 1.5 0 0 1 0 3z" fill="currentColor" />
                </svg>
                {t("location.navigate")}
              </a>
            </div>

            {/* Right: full map wrapped in Aceternity 3D PinContainer — 
                 on hover the card tilts on the X-axis (40deg) and the
                 cyan pin + radar pulses appear above it. */}
            <div className="relative flex min-h-[360px] items-center justify-center md:min-h-[420px]">
              <PinContainer
                title="Tu jesteśmy — Rena Bianca"
                href={MAPS_HREF}
                containerClassName="w-full max-w-[440px]"
                forceActive={pinActive}
              >
                <div className="flex w-[260px] flex-col sm:w-[320px] md:w-[380px]">
                  <div className="overflow-hidden rounded-xl" style={{ aspectRatio: "4/3" }}>
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2999.9625941782574!2d9.187300176560825!3d41.24437270485302!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12dbdff7fdbdfccd%3A0xa5f00b556e3e9542!2sRena%20Bianca%20beach%20bar!5e0!3m2!1spl!2spl!4v1776225511084!5m2!1spl!2spl"
                      className="h-full w-full border-0"
                      style={{ filter: "grayscale(0.5) contrast(1.1) brightness(0.8) hue-rotate(190deg)", pointerEvents: "none" }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Rena Bianca – mapa"
                    />
                  </div>
                  <div className="px-1 pb-1 pt-3">
                    <h3 className="font-heading text-sm text-sand sm:text-base" style={{ fontWeight: 500 }}>
                      Rena Bianca Beach Bar
                    </h3>
                    <p className="mt-1 font-body text-xs text-sand/50 sm:text-sm">
                      Spiaggia di Rena Bianca, Santa Teresa Gallura
                    </p>
                  </div>
                </div>
              </PinContainer>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ═══ CONTACT PANEL (enters from right) ═══ */}
      <div
        data-contact
        className="absolute inset-0 z-20 flex items-center will-change-transform"
      >
        <div className="mx-auto w-full max-w-5xl px-6 sm:px-10 md:px-14">
          <div className="max-w-lg">
            {/* Each logical "sentence" of the panel carries
                `data-contact-line` so the GSAP cascade can
                stagger them in one-at-a-time, each brightening
                from dim + blurred to fully crisp as it slides
                into place. The order in the DOM is the order of
                the reveal: eyebrow → heading → description →
                name/email → message → submit. `will-change:
                filter, transform` keeps the filter animation
                GPU-accelerated on phones. */}
            <span
              data-contact-line
              className="mb-3 block font-body text-[10px] uppercase tracking-[0.3em] text-ocean/60 sm:text-xs"
              style={{ willChange: "filter, transform, opacity" }}
            >
              {t("contact.label")}
            </span>
            <h2
              data-contact-line
              className="font-heading text-2xl text-sand sm:text-3xl md:text-4xl lg:text-5xl"
              style={{ fontWeight: 400, lineHeight: 1.1, willChange: "filter, transform, opacity" }}
            >
              {t("contact.heading").split("").map((ch, i) => (
                <span key={i} className="inline-block overflow-hidden">
                  <span data-h-letter className="inline-block will-change-transform">
                    {ch === " " ? "\u00A0" : ch}
                  </span>
                </span>
              ))}
            </h2>

            <p
              data-contact-line
              data-form-el
              className="mt-4 max-w-sm font-body text-sm leading-relaxed text-sand/50 md:mt-6 md:text-base"
              style={{ willChange: "filter, transform, opacity" }}
            >
              {t("contact.description")}
            </p>

            <form
              className="mt-8 flex flex-col gap-4 md:mt-10 md:gap-5"
              onSubmit={(e) => e.preventDefault()}
            >
              <div
                data-contact-line
                data-form-el
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                style={{ willChange: "filter, transform, opacity" }}
              >
                <div className="flex flex-col gap-1.5">
                  <label className="font-body text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">
                    {t("contact.name")}
                  </label>
                  <input
                    type="text"
                    placeholder={t("contact.namePlaceholder")}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-body text-sm text-sand placeholder-sand/25 outline-none transition-colors focus:border-ocean/40 focus:bg-white/8"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-body text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">
                    {t("contact.email")}
                  </label>
                  <input
                    type="email"
                    placeholder={t("contact.emailPlaceholder")}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-body text-sm text-sand placeholder-sand/25 outline-none transition-colors focus:border-ocean/40 focus:bg-white/8"
                  />
                </div>
              </div>
              <div
                data-contact-line
                data-form-el
                className="flex flex-col gap-1.5"
                style={{ willChange: "filter, transform, opacity" }}
              >
                <label className="font-body text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">
                  {t("contact.message")}
                </label>
                <textarea
                  rows={3}
                  placeholder={t("contact.messagePlaceholder")}
                  className="resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-body text-sm text-sand placeholder-sand/25 outline-none transition-colors focus:border-ocean/40 focus:bg-white/8"
                />
              </div>
              <button
                data-contact-line
                data-form-el
                type="submit"
                className="mt-2 w-fit rounded-full border border-ocean/30 bg-ocean/10 px-8 py-3 font-body text-xs font-medium uppercase tracking-wider text-sand/80 transition-all duration-300 hover:border-ocean/50 hover:bg-ocean/20 hover:text-sand sm:text-sm"
                style={{ willChange: "filter, transform, opacity" }}
              >
                {t("contact.submit")}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Wave animations (scoped) */}
      <style>{`
        .lct-wave-back-g > use {
          animation: lct-move 25s cubic-bezier(.55,.5,.45,.5) infinite;
        }
        .lct-wave-back-g > use:nth-child(1) { animation-delay: -2s; animation-duration: 6s; }
        .lct-wave-back-g > use:nth-child(2) { animation-delay: -3s; animation-duration: 8s; }
        .lct-wave-back-g > use:nth-child(3) { animation-delay: -4s; animation-duration: 11s; }
        .lct-wave-back-g > use:nth-child(4) { animation-delay: -5s; animation-duration: 16s; }

        .lct-wave-front-g > use {
          animation: lct-move 25s cubic-bezier(.55,.5,.45,.5) infinite;
        }
        .lct-wave-front-g > use:nth-child(1) { animation-delay: -1s; animation-duration: 5s; }
        .lct-wave-front-g > use:nth-child(2) { animation-delay: -2s; animation-duration: 7s; }
        .lct-wave-front-g > use:nth-child(3) { animation-delay: -3s; animation-duration: 10s; }
        .lct-wave-front-g > use:nth-child(4) { animation-delay: -4s; animation-duration: 14s; }

        @keyframes lct-move {
          0%   { transform: translate3d(-120px, 0, 0); }
          100% { transform: translate3d(120px, 0, 0); }
        }
      `}</style>
    </section>
  );
}
