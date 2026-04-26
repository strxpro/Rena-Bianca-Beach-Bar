"use client";

import { useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { getMobilePerformanceProfile } from "@/lib/mobile-performance";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function AboutGallery({ isEditMode: _isEditMode = false }: { isEditMode?: boolean }) {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const wrap = videoWrapRef.current;
      if (!section || !wrap) return;

      const { isMob, isLowEndMobile } = getMobilePerformanceProfile();

      // Initial state
      gsap.set(wrap, {
        width: isMob ? "90%" : "75%",
        height: isMob ? "60dvh" : "70dvh",
        borderRadius: isMob ? 16 : 24,
      });

      /* Create the expanding timeline */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: isMob ? "+=80%" : "+=100%",
          pin: true,
          pinSpacing: true,
          scrub: isMob ? (isLowEndMobile ? 1.2 : 0.8) : 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      const text = textRef.current;

      if (text) {
        tl.to(
          text,
          {
            opacity: 0,
            y: -30,
            duration: 0.2,
            ease: "power2.inOut",
          },
          0.8 // start fading out at 80% of the scrub timeline
        );
      }

      tl.to(
        wrap,
        {
          width: "100%",
          height: "100dvh",
          borderRadius: 0,
          boxShadow: "0 0 0 0 rgba(0,0,0,0), 0 0 0 0 rgba(255,255,255,0)",
          duration: 1,
          ease: "power2.inOut",
        },
        0
      );
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-[#0A192F]"
      style={{
        background:
          "linear-gradient(180deg, #0A192F 0%, #0d2240 50%, #0A192F 100%)",
      }}
    >
      <h2
        ref={textRef}
        className="absolute top-[10%] left-0 w-full text-center text-5xl md:text-7xl font-light text-sand tracking-wide uppercase z-30 pointer-events-none"
        style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
      >
        {t("video.welcome")}
      </h2>
      <div
        ref={videoWrapRef}
        className="relative overflow-hidden z-20"
        style={{
          width: "75%",
          height: "70dvh",
          borderRadius: 24,
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="pointer-events-none absolute inset-0 block h-full w-full bg-black object-cover"
        >
          <source src="/0426.mp4" type="video/mp4" />
        </video>
      </div>
    </section>
  );
}
