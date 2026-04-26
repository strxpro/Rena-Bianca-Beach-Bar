"use client";

import { useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   ABOUT — Invitation + looping video
   ═══════════════════════════════════════════════════════════════ */

export default function AboutGallery({ isEditMode: _isEditMode = false }: { isEditMode?: boolean }) {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!textRef.current || !videoWrapRef.current) return;

      gsap.fromTo(
        textRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: textRef.current,
            start: "top 78%",
            toggleActions: "play none none none",
            invalidateOnRefresh: true,
          },
        }
      );

      gsap.fromTo(
        videoWrapRef.current,
        { opacity: 0, y: 70, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.3,
          ease: "power3.out",
          scrollTrigger: {
            trigger: videoWrapRef.current,
            start: "top 82%",
            toggleActions: "play none none none",
            invalidateOnRefresh: true,
          },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative overflow-x-clip py-24 sm:py-32"
      style={{
        background:
          "linear-gradient(180deg, #f49762 0%, #c07a52 8%, #705546 18%, #273a56 34%, #183d62 54%, #11365a 74%, #0b2038 100%)",
        minHeight: "100dvh",
      }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,228,177,0.18),transparent_70%)] sm:h-52" />
      <div className="pointer-events-none absolute -left-20 top-24 h-56 w-56 rounded-full bg-[#f3c96a]/12 blur-3xl sm:h-72 sm:w-72" />
      <div className="pointer-events-none absolute -right-24 bottom-24 h-64 w-64 rounded-full bg-[#153252]/45 blur-3xl sm:h-80 sm:w-80" />

      <div
        className="relative z-10 mx-auto flex flex-col items-center px-5 sm:px-8"
        style={{ maxWidth: "min(900px, calc(100vw - 40px))" }}
      >
        {/* Text block */}
        <div ref={textRef} className="text-center" style={{ opacity: 0 }}>
          <p className="mb-5 font-body text-[10px] uppercase tracking-[0.42em] text-[#f3c96a]/65 sm:text-[11px] sm:tracking-[0.52em]">
            Rena Bianca &middot; Sardinia
          </p>

          <h2
            className="mb-6 font-heading text-[clamp(3rem,13vw,7.5rem)] leading-[0.9] tracking-[-0.03em] text-sand"
            style={{ fontWeight: 400 }}
          >
            {t("about.invite.heading")}
          </h2>

          <p className="mb-7 font-body text-[clamp(0.9rem,2.6vw,1.2rem)] italic leading-snug text-[#f3c96a]/90 sm:mb-9">
            {t("about.invite.subtitle")}
          </p>

          <p className="mx-auto max-w-[52ch] font-body text-[clamp(0.88rem,2vw,1.05rem)] leading-[1.72] text-sand/70">
            {t("about.invite.text")}
          </p>

          <div className="mx-auto mt-10 h-px w-20 bg-gradient-to-r from-transparent via-[#f3c96a]/45 to-transparent sm:mt-14 sm:w-28" />
        </div>

        {/* Video */}
        <div
          ref={videoWrapRef}
          className="mt-12 w-full overflow-hidden rounded-[20px] border border-white/10 shadow-[0_40px_110px_-24px_rgba(0,0,0,0.75)] sm:mt-16 sm:rounded-[28px] lg:rounded-[36px]"
          style={{ opacity: 0 }}
        >
          <video
            src="/filmrena.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="block w-full"
          />
        </div>
      </div>
    </section>
  );
}
