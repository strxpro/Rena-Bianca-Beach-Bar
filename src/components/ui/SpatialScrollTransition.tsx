"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

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

  useGSAP(
    () => {
      const container = containerRef.current;
      const top = topRef.current;
      const bottom = bottomRef.current;
      if (!container || !top || !bottom) return;

      /* Pin for 200vh total:
         0–0.5  = transition animation (top shrinks, bottom slides up)
         0.5–1  = menu visible, user interacts with the book */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: "+=200%",
          pin: true,
          scrub: 0.4,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          /* Join the shared `"pinned"` group with the other
             ScrollTrigger pins on the page (panorama, gallery,
             location) so they never overlap, and clamp fast
             swipes so the spatial push always plays through on
             phones. */
          fastScrollEnd: true,
          preventOverlaps: "pinned",
          snap: container.classList.contains("snap-container") ? {
            snapTo(progress: number) {
              if (progress < 0.17) return 0;
              if (progress < 0.66) return 0.33;
              return 1;
            },
            duration: { min: 0.2, max: 0.6 },
            delay: 0.12,
            ease: "power1.inOut",
          } : undefined,
        },
      });

      /* ── Scene A: push backward (0 → 0.5) ── */
      tl.fromTo(
        top,
        { scale: 1, borderRadius: "0px", filter: "brightness(1)" },
        {
          scale: 0.90,
          borderRadius: "20px",
          filter: "brightness(0.4)",
          ease: "power2.inOut",
          duration: 0.5,
        },
        0
      );

      /* ── Scene B: slide up from bottom (0 → 0.5) ── */
      tl.fromTo(
        bottom,
        {
          yPercent: 100,
          boxShadow: "0 -40px 100px rgba(0,0,0,0)",
        },
        {
          yPercent: 0,
          boxShadow: "0 -40px 100px rgba(0,0,0,0.8)",
          ease: "power2.inOut",
          duration: 0.5,
        },
        0
      );

      /* 0.5 → 1.0 = menu stays visible, nothing animates (hold) */
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: "100dvh", background: "#0A192F" }}
    >
      {/* ── Scene A (top / background) ── */}
      <div
        ref={topRef}
        className="absolute inset-0 z-0 overflow-hidden will-change-transform"
        style={{ transformOrigin: "50% 30%" }}
      >
        {topSection}
      </div>

      {/* ── Scene B (bottom / foreground — slides over A) ── */}
      <div
        ref={bottomRef}
        className="absolute inset-0 z-10 overflow-hidden will-change-transform"
        style={{ transformOrigin: "50% 0%" }}
      >
        {bottomSection}
      </div>
    </div>
  );
}
