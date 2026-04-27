"use client";

import { useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { getMobilePerformanceProfile } from "@/lib/mobile-performance";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function AboutGallery() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const wrap = videoWrapRef.current;
      if (!section || !wrap) return;

      const { isMobile, isLowEndMobile } = getMobilePerformanceProfile();

      // Initial state
      gsap.set(wrap, {
        width: isMobile ? "90%" : "75%",
        height: isMobile ? "60vh" : "70vh",
        borderRadius: isMobile ? 16 : 24,
      });

      /* Create the expanding timeline */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: isMobile ? (isLowEndMobile ? 1.2 : 0.8) : 0.6,
          invalidateOnRefresh: true,
        },
      });

      tl.to(
        wrap,
        {
          width: "100%",
          height: "100vh",
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

  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative w-full bg-[#0A192F]"
      style={{
        height: "200vh", // 100vh for normal view + 100vh for scrub duration
        background:
          "linear-gradient(180deg, #0A192F 0%, #0d2240 50%, #0A192F 100%)",
      }}
    >
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        <h2
          ref={textRef}
          className="absolute top-[10%] left-0 w-full text-center text-5xl md:text-7xl font-light text-sand tracking-wide uppercase z-30 pointer-events-none"
          style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
        >
          {t("video.welcome")}
        </h2>
        <div
          ref={videoWrapRef}
          className="relative overflow-hidden z-20 bg-black/40"
          style={{
            width: "75%",
            height: "70vh",
            borderRadius: 24,
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          {/* Skeleton Loader */}
          {!isVideoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#0A192F] animate-pulse">
              <div className="w-12 h-12 border-4 border-ocean/30 border-t-ocean rounded-full animate-spin" />
            </div>
          )}
          <video
            autoPlay
            muted
            defaultMuted
            loop
            playsInline
            preload="auto"
            onCanPlay={() => setIsVideoLoaded(true)}
            onLoadedData={() => setIsVideoLoaded(true)}
            className={`pointer-events-none absolute inset-0 block h-full w-full object-cover transition-opacity duration-500 ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            }`}
          >
            <source src="/0426.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}
