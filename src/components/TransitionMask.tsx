"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function TransitionMask() {
  const maskRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const mask = maskRef.current;
      const svg = svgRef.current;
      if (!mask || !svg) return;

      const path = svg.querySelector("path");
      if (!path) return;

      gsap.to(path, {
        attr: { d: "M 0 0 Q 50 0 100 0 L 100 100 Q 50 100 0 100 Z" },
        ease: "none",
        scrollTrigger: {
          trigger: mask,
          start: "top 80%",
          end: "top 20%",
          scrub: 1,
        },
      });
    },
    { scope: maskRef }
  );

  return (
    <div ref={maskRef} className="relative h-[20dvh] bg-sand -mt-1 z-10">
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M 0 0 Q 50 50 100 0 L 100 100 Q 50 50 0 100 Z"
          fill="var(--color-sand-warm)"
        />
      </svg>
    </div>
  );
}
