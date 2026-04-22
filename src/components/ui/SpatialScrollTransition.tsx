"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   SPATIAL SCROLL TRANSITION
   ─────────────────────────────────────────────────────────────
   Remotion-style "Spatial Push / Card Stack" effect recreated
   with GSAP ScrollTrigger (scroll-driven, no video player).
   ─────────────────────────────────────────────────────────────
   Scene A (topSection) pins and shrinks backward while
   Scene B (bottomSection) slides up from below, casting a
   heavy shadow.  Once B is in place it becomes fully interactive.
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  topSection: ReactNode;
  bottomSection: ReactNode;
}

export default function SpatialScrollTransition({ topSection, bottomSection }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topOverlayRef = useRef<HTMLDivElement>(null);
  const bottomShadowRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const container = containerRef.current;
      const top = topRef.current;
      const bottom = bottomRef.current;
      const topOverlay = topOverlayRef.current;
      const bottomShadow = bottomShadowRef.current;
      if (!container || !top || !bottom || !topOverlay || !bottomShadow) return;

      /* matchMedia ensures GSAP reverts ALL inline transforms when
         the viewport drops below md — fixes the huge gap on mobile
         caused by `yPercent: 100` leaking onto Scene B. */
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: container,
            start: "top top",
            end: "+=200%",
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        /* ── Scene A: push backward (0 → 0.5) ── */
        tl.fromTo(
          top,
          { scale: 1, borderRadius: "0px" },
          { scale: 0.90, borderRadius: "20px", ease: "power2.inOut", duration: 0.5 },
          0
        );
        tl.fromTo(topOverlay, { opacity: 0 }, { opacity: 0.6, ease: "power2.inOut", duration: 0.5 }, 0);

        /* ── Scene B: slide up from bottom (0 → 0.5) ── */
        tl.fromTo(bottom, { yPercent: 100 }, { yPercent: 0, ease: "power2.inOut", duration: 0.5 }, 0);
        tl.fromTo(bottomShadow, { opacity: 0 }, { opacity: 1, ease: "power2.inOut", duration: 0.5 }, 0);

        /* 0.5 → 1.0 = menu stays visible, nothing animates (hold) */
        return () => { tl.kill(); };
      });
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="pointer-events-none relative w-full overflow-visible md:h-dvh md:overflow-x-clip md:overflow-y-auto md:overscroll-y-contain"
      style={{ background: "#0A192F" }}
    >
      {/* ── Scene A (top / background) ── */}
      <div
        ref={topRef}
        className="pointer-events-none relative z-0 min-h-[140px] overflow-hidden sm:min-h-[200px] md:absolute md:inset-0 md:min-h-0 md:will-change-transform"
        style={{ transformOrigin: "50% 30%" }}
      >
        {topSection}
        <div
          ref={topOverlayRef}
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: 0 }}
        />
      </div>

      {/* ── Scene B (bottom / foreground — slides over A) ── */}
      <div
        ref={bottomRef}
        className="pointer-events-auto relative z-10 -mt-24 overflow-visible rounded-t-[32px] shadow-[0_-30px_90px_-34px_rgba(0,0,0,0.82)] sm:-mt-28 md:absolute md:inset-0 md:mt-0 md:min-h-0 md:overflow-x-clip md:overflow-y-auto md:rounded-none md:shadow-none md:will-change-transform md:overscroll-y-contain"
        style={{ transformOrigin: "50% 0%" }}
      >
        <div
          ref={bottomShadowRef}
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-linear-to-b from-black/70 via-black/25 to-transparent"
          style={{ opacity: 0 }}
        />
        {bottomSection}
      </div>
    </div>
  );
}
