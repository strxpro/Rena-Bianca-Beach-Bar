"use client";

import { useRef, useLayoutEffect, type CSSProperties, type ReactNode } from "react";
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
  scrollXPercent: number;
  scrollRotate: number;
  scrollScale: number;
  depth: number;
  opacity: number;
  filter: string;
  /** One of: */
  svg?: ReactNode;
  src?: string;
  alt?: string;
};

const ITEMS: FloatItem[] = [
  {
    id: "drink",
    position: { top: "4%", right: "4%" },
    width: "clamp(108px, 14vw, 210px)",
    rotate: 10,
    idle: { duration: 8.5, delay: 0.3, xAmp: 16, yAmp: 20, rotAmp: 5 },
    scrollYPercent: 18,
    scrollXPercent: -12,
    scrollRotate: 16,
    scrollScale: 1.08,
    depth: 1.35,
    opacity: 0.26,
    filter: "drop-shadow(0 28px 42px rgba(10,25,47,0.26))",
    src: "/Latajace%20elementy%20menu/drink.png",
    alt: "",
  },
  {
    id: "arbuz",
    position: { top: "28%", left: "3%" },
    width: "clamp(96px, 13vw, 190px)",
    rotate: -15,
    idle: { duration: 10.5, delay: 1.2, xAmp: 18, yAmp: 14, rotAmp: 7 },
    scrollYPercent: -14,
    scrollXPercent: 10,
    scrollRotate: -12,
    scrollScale: 1.05,
    depth: 1.1,
    opacity: 0.24,
    filter: "drop-shadow(0 24px 40px rgba(10,25,47,0.22))",
    src: "/Latajace%20elementy%20menu/arbuz.png",
    alt: "",
  },
  {
    id: "kanapka",
    position: { bottom: "8%", right: "8%" },
    width: "clamp(120px, 16vw, 220px)",
    rotate: 12,
    idle: { duration: 11.5, delay: 2.4, xAmp: 20, yAmp: 18, rotAmp: 6 },
    scrollYPercent: -20,
    scrollXPercent: -14,
    scrollRotate: 18,
    scrollScale: 1.1,
    depth: 1.5,
    opacity: 0.22,
    filter: "drop-shadow(0 34px 48px rgba(10,25,47,0.28))",
    src: "/Latajace%20elementy%20menu/kanapka.png",
    alt: "",
  },
  {
    id: "hamburger",
    position: { bottom: "22%", left: "14%" },
    width: "clamp(118px, 15vw, 215px)",
    rotate: -10,
    idle: { duration: 9.8, delay: 3.6, xAmp: 15, yAmp: 16, rotAmp: 5 },
    scrollYPercent: 15,
    scrollXPercent: 12,
    scrollRotate: -15,
    scrollScale: 1.07,
    depth: 1.2,
    opacity: 0.2,
    filter: "drop-shadow(0 30px 44px rgba(10,25,47,0.24))",
    src: "/Latajace%20elementy%20menu/hamburger.png",
    alt: "",
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

        gsap.fromTo(
          el,
          {
            xPercent: 0,
            yPercent: 0,
            rotate: item.rotate ?? 0,
            scale: 1,
          },
          {
            xPercent: item.scrollXPercent,
            yPercent: item.scrollYPercent,
            rotate: (item.rotate ?? 0) + item.scrollRotate,
            scale: item.scrollScale,
            ease: "none",
            scrollTrigger: {
              trigger: wrap,
              start: "top bottom",
              end: "bottom top",
              scrub: (typeof window !== "undefined" && window.innerWidth < 768) ? 0.4 : 1.2, // FIX: reduced scrub on mobile
            },
          }
        );
      });

      const tiltElements = ITEMS.map((item) => ({
        item,
        element: wrap.querySelector<HTMLElement>(`[data-float-tilt="${item.id}"]`),
      })).filter((entry): entry is { item: FloatItem; element: HTMLElement } => Boolean(entry.element));

      const applyTilt = (nx: number, ny: number) => {
        tiltElements.forEach(({ item, element }) => {
          gsap.to(element, {
            x: nx * 20 * item.depth,
            y: ny * 16 * item.depth,
            rotateY: nx * 8 * item.depth,
            rotateX: ny * -7 * item.depth,
            duration: 0.7,
            ease: "power2.out",
            overwrite: "auto",
          });
        });
      };

      const resetTilt = () => {
        tiltElements.forEach(({ element }) => {
          gsap.to(element, {
            x: 0,
            y: 0,
            rotateY: 0,
            rotateX: 0,
            duration: 0.8,
            ease: "power2.out",
            overwrite: "auto",
          });
        });
      };

      const onPointerMove = (event: PointerEvent) => {
        if (window.innerWidth < 768) return;
        const rect = wrap.getBoundingClientRect();
        if (
          event.clientX < rect.left
          || event.clientX > rect.right
          || event.clientY < rect.top
          || event.clientY > rect.bottom
        ) {
          resetTilt();
          return;
        }

        const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        applyTilt(nx, ny);
      };

      const onDeviceOrientation = (event: DeviceOrientationEvent) => {
        if (window.innerWidth >= 768) return;
        if (event.gamma == null && event.beta == null) return;

        const nx = Math.max(-1, Math.min(1, (event.gamma ?? 0) / 18));
        const ny = Math.max(-1, Math.min(1, ((event.beta ?? 0) - 45) / 30));
        applyTilt(nx, ny);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("deviceorientation", onDeviceOrientation);
      window.addEventListener("orientationchange", resetTilt);

      return () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("deviceorientation", onDeviceOrientation);
        window.removeEventListener("orientationchange", resetTilt);
      };
    }, wrap);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-0 overflow-hidden perspective-[1600px] transform-3d"
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
            opacity: item.opacity,
            transform: `rotate(${item.rotate ?? 0}deg)`,
          }}
        >
          <div
            data-float-tilt={item.id}
            className="h-full w-full transform-3d" /* FIX: removed will-change-transform — parent already promotes to GPU layer */
          >
            <div
              className="h-full w-full" /* FIX: removed will-change-transform — GSAP force3D handles compositing */
              style={
                {
                  animation: `menuFloatIdle_x ${item.idle.duration}s ease-in-out ${item.idle.delay}s infinite`,
                  "--xa": `${item.idle.xAmp}px`,
                  "--ya": `${item.idle.yAmp}px`,
                  "--ra": item.idle.rotAmp,
                  filter: item.filter,
                } as CSSProperties
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
        </div>
      ))}
    </div>
  );
}
