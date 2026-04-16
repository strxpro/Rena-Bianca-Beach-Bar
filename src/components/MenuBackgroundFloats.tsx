"use client";

import { useRef, useLayoutEffect, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   MENU BACKGROUND — floating decorative elements
   ───────────────────────────────────────────────────────────────
   Two layers of motion combined:

   1. Idle float — CSS keyframe animation per element (runs forever
      regardless of scroll) so the menu feels "alive" when the user
      is just standing there reading.

   2. Scroll drift — GSAP ScrollTrigger drifts each element by a
      small amount (opposite directions → parallax depth) as the
      user scrolls past the menu section.

   Swapping SVGs for PNGs:
      Each ITEM below has either a `svg` JSX block OR a `src` path.
      Drop a PNG into /public/menu-decor/ and replace `svg` with
      `src: "/menu-decor/my-image.png"` — the component picks up
      PNG automatically.
   ═══════════════════════════════════════════════════════════════ */

type FloatItem = {
  id: string;
  /** Position offsets (pct or px). Any valid CSS position value. */
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  /** Width (Tailwind clamp strings work too). Height is auto. */
  width: string;
  /** Starting rotation in degrees. */
  rotate?: number;
  /** Idle animation — how far it drifts from its rest pose. */
  idle: {
    /** Seconds for a full loop. */
    duration: number;
    /** Seconds before the loop starts (desync items). */
    delay: number;
    /** Horizontal drift amplitude in px. */
    xAmp: number;
    /** Vertical drift amplitude in px. */
    yAmp: number;
    /** Rotation amplitude in deg. */
    rotAmp: number;
  };
  /** Scroll parallax — yPercent drift across the pinned menu scroll. */
  scrollYPercent: number;
  /** One of: */
  svg?: ReactNode;
  src?: string;
  alt?: string;
};

const ITEMS: FloatItem[] = [
  {
    id: "parasol",
    position: { top: "-2rem", left: "8%" },
    width: "clamp(90px, 12vw, 160px)",
    rotate: -12,
    idle: { duration: 9, delay: 0, xAmp: 14, yAmp: 18, rotAmp: 4 },
    scrollYPercent: -18,
    svg: (
      <svg viewBox="0 0 80 100" fill="none" className="h-full w-full">
        <path d="M40 5 C8 5 2 35 40 35 C78 35 72 5 40 5Z" fill="currentColor" className="text-sand" />
        <rect x="38" y="20" width="4" height="70" rx="2" fill="currentColor" className="text-sand" />
      </svg>
    ),
  },
  {
    id: "cocktail",
    position: { top: "12%", right: "6%" },
    width: "clamp(70px, 9vw, 120px)",
    rotate: 8,
    idle: { duration: 7, delay: 1.5, xAmp: 10, yAmp: 22, rotAmp: 6 },
    scrollYPercent: 14,
    svg: (
      <svg viewBox="0 0 60 80" fill="none" className="h-full w-full">
        <path d="M12 8 L48 8 L32 38 L32 62 L42 68 L18 68 L28 62 L28 38Z" fill="currentColor" className="text-sand" />
        <circle cx="46" cy="14" r="8" fill="currentColor" className="text-ocean" />
        <rect x="44" y="2" width="2" height="14" rx="1" fill="currentColor" className="text-ocean" />
      </svg>
    ),
  },
  {
    id: "palm",
    position: { bottom: "10%", left: "4%" },
    width: "clamp(110px, 14vw, 180px)",
    rotate: 20,
    idle: { duration: 11, delay: 3, xAmp: 18, yAmp: 14, rotAmp: 5 },
    scrollYPercent: -22,
    svg: (
      <svg viewBox="0 0 100 80" fill="none" className="h-full w-full">
        <path
          d="M10 70 Q30 30 50 40 Q40 20 80 10 Q50 25 55 45 Q60 15 95 15 Q60 30 58 50 Q70 30 95 35 Q65 42 55 60Z"
          fill="currentColor"
          className="text-sand"
        />
      </svg>
    ),
  },
  {
    id: "coconut",
    position: { bottom: "18%", right: "8%" },
    width: "clamp(60px, 8vw, 100px)",
    rotate: 0,
    idle: { duration: 8, delay: 2, xAmp: 8, yAmp: 16, rotAmp: 10 },
    scrollYPercent: 12,
    svg: (
      <svg viewBox="0 0 50 50" fill="none" className="h-full w-full">
        <ellipse cx="25" cy="28" rx="18" ry="16" fill="currentColor" className="text-sand" />
        <circle cx="18" cy="24" r="2.5" fill="currentColor" className="text-navy" />
        <circle cx="32" cy="24" r="2.5" fill="currentColor" className="text-navy" />
        <ellipse cx="25" cy="32" rx="3" ry="2" fill="currentColor" className="text-navy" />
      </svg>
    ),
  },
  {
    id: "shell",
    position: { top: "42%", left: "48%" },
    width: "clamp(50px, 7vw, 90px)",
    rotate: -25,
    idle: { duration: 10, delay: 4.5, xAmp: 20, yAmp: 10, rotAmp: 8 },
    scrollYPercent: -10,
    svg: (
      <svg viewBox="0 0 50 40" fill="none" className="h-full w-full">
        <path d="M5 35 Q10 5 25 5 Q40 5 45 35 Q35 25 25 20 Q15 25 5 35Z" fill="currentColor" className="text-sand" />
        <path
          d="M25 5 L25 35 M15 10 L20 35 M35 10 L30 35"
          stroke="currentColor"
          className="text-sand"
          strokeWidth="0.5"
          opacity="0.5"
        />
      </svg>
    ),
  },
  /* Extra layer for depth — subtle orbs drifting in the far background */
  {
    id: "orb-1",
    position: { top: "25%", left: "18%" },
    width: "clamp(90px, 12vw, 160px)",
    idle: { duration: 14, delay: 0, xAmp: 26, yAmp: 32, rotAmp: 0 },
    scrollYPercent: -6,
    svg: (
      <div
        className="h-full w-full rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(253,251,247,0.22) 0%, rgba(59,130,196,0.08) 60%, rgba(10,25,47,0) 100%)",
          filter: "blur(6px)",
        }}
      />
    ),
  },
  {
    id: "orb-2",
    position: { bottom: "30%", right: "22%" },
    width: "clamp(70px, 10vw, 130px)",
    idle: { duration: 17, delay: 3, xAmp: 22, yAmp: 18, rotAmp: 0 },
    scrollYPercent: 8,
    svg: (
      <div
        className="h-full w-full rounded-full"
        style={{
          background:
            "radial-gradient(circle at 70% 40%, rgba(59,130,196,0.35) 0%, rgba(59,130,196,0.06) 55%, rgba(10,25,47,0) 100%)",
          filter: "blur(8px)",
        }}
      />
    ),
  },
];

export default function MenuBackgroundFloats() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const ctx = gsap.context(() => {
      ITEMS.forEach((item) => {
        const el = wrap.querySelector<HTMLElement>(`[data-float-id="${item.id}"]`);
        if (!el) return;

        gsap.to(el, {
          yPercent: item.scrollYPercent,
          ease: "none",
          scrollTrigger: {
            trigger: wrap,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
          },
        });
      });
    }, wrap);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes menuFloatIdle_x { 0%,100% { transform: translate3d(0,0,0) rotate(0deg); } 25% { transform: translate3d(var(--xa),calc(var(--ya) * -0.3),0) rotate(calc(var(--ra) * 1deg)); } 50% { transform: translate3d(0,calc(var(--ya) * -1),0) rotate(calc(var(--ra) * -0.6deg)); } 75% { transform: translate3d(calc(var(--xa) * -1),calc(var(--ya) * -0.3),0) rotate(calc(var(--ra) * -1deg)); } }
      `}</style>

      {ITEMS.map((item) => (
        <div
          key={item.id}
          data-float-id={item.id}
          className="absolute will-change-transform"
          style={{
            ...item.position,
            width: item.width,
            opacity: 0.08,
            transform: `rotate(${item.rotate ?? 0}deg)`,
          }}
        >
          <div
            className="h-full w-full will-change-transform"
            style={
              {
                animation: `menuFloatIdle_x ${item.idle.duration}s ease-in-out ${item.idle.delay}s infinite`,
                "--xa": `${item.idle.xAmp}px`,
                "--ya": `${item.idle.yAmp}px`,
                "--ra": item.idle.rotAmp,
              } as React.CSSProperties
            }
          >
            {item.src ? (
              <img
                src={item.src}
                alt={item.alt ?? ""}
                draggable={false}
                className="h-full w-full select-none object-contain"
              />
            ) : (
              item.svg
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
