"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   CONTACT ORBIT TRANSITION  —  Sunset Scene
   ─────────────────────────────────────────────────────────────
   Cinematic scroll-driven sequence at end of page:

   1. Sunset scene (sky, sea, sun, animated waves, flying birds)
      rises from the bottom — warm golden/orange palette
   2. The "page content" orbits out diagonally to the left
   3. Contact form slides in from the right
   4. Background gradient shifts during the transition
   5. Everything exits, settling for footer

   Colours: warm sunset — orange, gold, khaki sky + chocolate sea
   ═══════════════════════════════════════════════════════════════ */

const HEADING = "Skontaktuj się z nami";

// Deterministic bird positions (no Math.random for SSR safety)
const BIRDS = Array.from({ length: 20 }, (_, i) => ({
  x: ((i * 47 + 23) % 600) - 300,
  y: ((i * 31 + 11) % 200) - 150,
  rot: ((i * 13 + 5) % 40) - 20,
  flyDur: `${(((i * 37 + 17) % 10000) + 5000) / 1000}s`,
  flyDelay: `${(-((i * 41 + 7) % 20000) / 1000).toFixed(1)}s`,
  wingDelay: `${(-((i * 29 + 3) % 20000) / 1000).toFixed(1)}s`,
}));

// Animated water wave positions
const WAVES = Array.from({ length: 6 }, (_, i) => ({
  delay: i > 0 ? `${(-i * 500).toFixed(0)}ms` : undefined,
}));

export default function ContactOrbitTransition() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const sunset = section.querySelector("[data-sunset]") as HTMLElement;
      const pageContent = section.querySelector("[data-page-content]") as HTMLElement;
      const contactPanel = section.querySelector("[data-contact]") as HTMLElement;
      const gradientOverlay = section.querySelector("[data-gradient-shift]") as HTMLElement;
      const headingLetters = section.querySelectorAll("[data-h-letter]");
      const formEls = section.querySelectorAll("[data-form-el]");

      if (!sunset || !pageContent || !contactPanel || !gradientOverlay) return;

      // Initial states
      gsap.set(sunset, { yPercent: 100, opacity: 0 });
      gsap.set(contactPanel, { xPercent: 110, opacity: 0 });
      gsap.set(gradientOverlay, { opacity: 0 });
      gsap.set(headingLetters, { yPercent: 120 });
      gsap.set(formEls, { opacity: 0, y: 30 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=500%",
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
        },
      });

      /* ═══ Phase 1: Sunset scene rises (0 → 0.15) ═══ */
      tl.to(sunset, {
        yPercent: 0,
        opacity: 1,
        duration: 0.15,
        ease: "power2.out",
      }, 0);

      /* ═══ Phase 2: Gradient shifts (0.10 → 0.35) ═══ */
      tl.to(gradientOverlay, {
        opacity: 1,
        duration: 0.25,
        ease: "none",
      }, 0.10);

      /* ═══ Phase 3: Page content orbits out (0.15 → 0.40) ═══ */
      tl.to(pageContent, {
        xPercent: -140,
        yPercent: -25,
        rotation: -18,
        scale: 0.45,
        opacity: 0,
        duration: 0.25,
        ease: "power2.inOut",
      }, 0.15);

      /* ═══ Phase 4: Contact slides from right (0.28 → 0.48) ═══ */
      tl.to(contactPanel, {
        xPercent: 0,
        opacity: 1,
        duration: 0.20,
        ease: "power3.out",
      }, 0.28);

      /* ═══ Heading letters (0.34 → 0.44) ═══ */
      tl.to(headingLetters, {
        yPercent: 0,
        stagger: 0.004,
        duration: 0.10,
        ease: "expo.out",
      }, 0.34);

      /* ═══ Form elements stagger in (0.42 → 0.50) ═══ */
      tl.to(formEls, {
        opacity: 1,
        y: 0,
        stagger: 0.012,
        duration: 0.08,
        ease: "power2.out",
      }, 0.42);

      /* ═══ Hold (0.52 → 0.72) ═══ */

      /* ═══ Phase 5: Exit (0.72 → 0.92) ═══ */
      tl.to(sunset, {
        yPercent: 100,
        opacity: 0,
        duration: 0.14,
        ease: "power2.in",
      }, 0.74);

      tl.to(contactPanel, {
        xPercent: -110,
        opacity: 0,
        duration: 0.14,
        ease: "power2.in",
      }, 0.78);

      tl.to(gradientOverlay, {
        opacity: 0,
        duration: 0.12,
        ease: "none",
      }, 0.86);
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="relative h-dvh w-full overflow-hidden"
      style={{ background: "#0A192F" }}
    >
      {/* ── Gradient shift overlay ── */}
      <div
        data-gradient-shift
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(180deg, #0a1628 0%, #0d2240 25%, #1a4a6e 50%, #122a4a 75%, #0a1628 100%)",
        }}
      />

      {/* ── Page content (orbits out to the left) ── */}
      <div
        data-page-content
        className="absolute inset-0 z-1 flex items-center justify-center will-change-transform"
      >
        <div className="flex flex-col items-center gap-6 opacity-40">
          <div className="h-1.5 w-48 rounded-full bg-sand/30" />
          <div className="h-1.5 w-32 rounded-full bg-sand/15" />
          <div className="mt-6 grid grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-20 w-28 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, rgba(59,130,196,${0.08 + i * 0.02}), rgba(253,251,247,${0.03 + i * 0.01}))`,
                  border: "1px solid rgba(253,251,247,0.05)",
                }}
              />
            ))}
          </div>
          <div className="mt-4 h-1 w-20 rounded-full bg-ocean/20" />
        </div>
      </div>

      {/* ═══ SUNSET SCENE (rises from bottom) ═══ */}
      <div
        data-sunset
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 will-change-transform overflow-hidden rounded-t-lg"
        style={{
          height: "clamp(250px, 55%, 500px)",
          perspective: "600px",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Sky — warm orange gradient */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "55%",
            background:
              "radial-gradient(ellipse at bottom, rgba(255,255,0,1) 0%, rgba(240,230,140,1) 15%, rgba(255,165,0,1) 100%)",
          }}
        />

        {/* Horizon glow */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "50%",
            width: "100%",
            maxWidth: "800px",
            height: "200px",
            borderRadius: "100%",
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)",
            filter: "blur(10px)",
          }}
        />

        {/* Sun */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "calc(50% + 10px)",
            width: "clamp(60px, 10vw, 100px)",
            height: "clamp(35px, 5.5vw, 55px)",
            borderRadius: "100px 100px 0 0",
            background:
              "linear-gradient(0deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,1) 100%)",
            zIndex: 999,
            filter: "blur(4px) contrast(2)",
          }}
        />

        {/* Sea — warm brown/gold gradient */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "45%",
            background:
              "radial-gradient(ellipse at top, rgba(255,255,255,1) 0%, rgba(255,215,0,0.1) 10%, rgba(210,105,30,1) 100%)",
          }}
        />

        {/* Shimmer line */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "55%",
            width: "60%",
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), rgba(255,255,255,0.6), rgba(255,255,255,0.4), transparent)",
            animation: "ocean-shimmer 3s ease-in-out infinite",
          }}
        />

        {/* Animated water waves */}
        {WAVES.map((w, i) => (
          <div
            key={i}
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: "calc(50% + 37px)",
              width: "clamp(80px, 12vw, 120px)",
              height: "12px",
              background: "#fff",
              borderRadius: "100%",
              ...(w.delay
                ? { animation: `sunset-wave 2s ${w.delay} infinite linear` }
                : {}),
            }}
          />
        ))}

        {/* Vertical lines (window frame effect) */}
        <div
          className="absolute left-1/2 hidden sm:block"
          style={{
            top: "50%",
            width: "14px",
            height: "50%",
            background: "white",
            transform: "translateZ(300px) translateX(-70px) translateY(-50%)",
          }}
        />
        <div
          className="absolute left-1/2 hidden sm:block"
          style={{
            top: "50%",
            width: "14px",
            height: "50%",
            background: "white",
            transform: "translateZ(300px) translateX(70px) translateY(-50%)",
          }}
        />

        {/* Birds */}
        {BIRDS.map((bird, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: "calc(50% + 60px)",
              left: "calc(50% - 40px)",
              transform: `translate(${bird.x}px, ${bird.y}px) rotate(${bird.rot}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "80px",
                animation: `bird-fly ${bird.flyDur} ${bird.flyDelay} linear infinite`,
                transformStyle: "preserve-3d",
              }}
            >
              {/* Left wing */}
              <div
                style={{
                  position: "absolute",
                  width: "50%",
                  height: "20px",
                  borderTop: "4px solid black",
                  borderRadius: "100%",
                  transformOrigin: "100% 50%",
                  animation: `wing-left 0.8s ${bird.wingDelay} cubic-bezier(0.445,0.05,0.55,0.95) infinite alternate`,
                }}
              />
              {/* Right wing */}
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  width: "50%",
                  height: "20px",
                  borderTop: "4px solid black",
                  borderRadius: "100%",
                  transformOrigin: "0 50%",
                  animation: `wing-right 0.8s ${bird.wingDelay} cubic-bezier(0.445,0.05,0.55,0.95) infinite alternate`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ═══ CONTACT PANEL (slides from right) ═══ */}
      <div
        data-contact
        className="absolute inset-y-0 right-0 z-30 flex w-full flex-col justify-center px-6 will-change-transform sm:w-[60%] sm:px-10 md:w-[50%] md:px-14 lg:w-[42%]"
      >
        <div className="mb-2">
          <span className="mb-3 block font-body text-[10px] uppercase tracking-[0.3em] text-ocean/60 sm:text-xs">
            Formularz kontaktowy
          </span>
        </div>
        <h2
          className="font-heading text-2xl text-sand sm:text-3xl md:text-4xl lg:text-5xl"
          style={{ fontWeight: 400, lineHeight: 1.1 }}
        >
          {HEADING.split("").map((ch, i) => (
            <span key={i} className="inline-block overflow-hidden">
              <span data-h-letter className="inline-block will-change-transform">
                {ch === " " ? "\u00A0" : ch}
              </span>
            </span>
          ))}
        </h2>

        <p
          data-form-el
          className="mt-4 max-w-sm font-body text-sm leading-relaxed text-sand/50 md:mt-6 md:text-base"
        >
          Masz pytanie lub chcesz zarezerwować stolik? Napisz do nas —
          odpowiemy najszybciej jak to możliwe.
        </p>

        <form
          className="mt-8 flex flex-col gap-4 md:mt-10 md:gap-5"
          onSubmit={(e) => e.preventDefault()}
        >
          <div data-form-el className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">
                Imię
              </label>
              <input
                type="text"
                placeholder="Twoje imię"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-body text-sm text-sand placeholder-sand/25 outline-none transition-colors focus:border-ocean/40 focus:bg-white/8"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">
                Email
              </label>
              <input
                type="email"
                placeholder="twoj@email.com"
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-body text-sm text-sand placeholder-sand/25 outline-none transition-colors focus:border-ocean/40 focus:bg-white/8"
              />
            </div>
          </div>
          <div data-form-el className="flex flex-col gap-1.5">
            <label className="font-body text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">
              Wiadomość
            </label>
            <textarea
              rows={3}
              placeholder="Twoja wiadomość..."
              className="resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-body text-sm text-sand placeholder-sand/25 outline-none transition-colors focus:border-ocean/40 focus:bg-white/8"
            />
          </div>
          <button
            data-form-el
            type="submit"
            className="mt-2 w-fit rounded-full border border-ocean/30 bg-ocean/10 px-8 py-3 font-body text-xs font-medium uppercase tracking-wider text-sand/80 transition-all duration-300 hover:border-ocean/50 hover:bg-ocean/20 hover:text-sand sm:text-sm"
          >
            Wyślij wiadomość
          </button>
        </form>
      </div>
    </section>
  );
}
