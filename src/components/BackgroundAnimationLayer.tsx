"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const SHAPES = [
  { top: "8%",  left: "6%",  size: 80,  type: "circle-outline", speed: -120, rot: 60 },
  { top: "22%", right: "9%", size: 48,  type: "square",         speed: 150,  rot: -90 },
  { top: "40%", left: "4%",  size: 64,  type: "rounded",        speed: -80,  rot: 45 },
  { top: "58%", right: "7%", size: 36,  type: "dot",            speed: 200,  rot: 0 },
  { top: "15%", left: "55%", size: 120, type: "line",           speed: -60,  rot: 30 },
  { top: "70%", left: "12%", size: 56,  type: "circle-outline", speed: 130,  rot: -60 },
];

export default function BackgroundAnimationLayer() {
  const layerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useGSAP(
    () => {
      if (isMobile) return;
      const shapes = layerRef.current?.querySelectorAll("[data-float]");
      if (!shapes?.length) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: document.documentElement,
          start: "0% 0%",
          end: "100% 100%",
          scrub: 1.25,
        },
      });

      shapes.forEach((shape, i) => {
        const s = SHAPES[i];
        if (!s) return;
        tl.to(shape, {
          y: s.speed,
          rotation: s.rot,
          ease: "none",
          duration: 1,
        }, 0);
      });
    },
    { scope: layerRef, dependencies: [isMobile] }
  );

  if (isMobile) {
    return null;
  }

  return (
    <div
      ref={layerRef}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {SHAPES.map((s, i) => {
        const pos: React.CSSProperties = {
          position: "absolute",
          top: s.top,
          width: s.type === "line" ? s.size : s.size,
          height: s.type === "line" ? 1 : s.size,
        };
        if ("left" in s) pos.left = s.left;
        if ("right" in s) pos.right = s.right;

        let cls = "will-change-transform ";
        switch (s.type) {
          case "circle-outline":
            cls += "rounded-full border border-ocean/10";
            break;
          case "square":
            cls += "rounded-lg bg-sand/[0.04] rotate-45";
            break;
          case "rounded":
            cls += "rounded-2xl border border-sand/[0.06]";
            break;
          case "dot":
            cls += "rounded-full bg-ocean/[0.06]";
            break;
          case "line":
            cls += "bg-gradient-to-r from-transparent via-sand/10 to-transparent";
            pos.height = 1;
            break;
        }

        return <div key={i} data-float className={cls} style={pos} />;
      })}
    </div>
  );
}
