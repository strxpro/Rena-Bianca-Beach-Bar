"use client";

import { useI18n } from "@/i18n/I18nProvider";

export default function AboutGallery({ isEditMode: _isEditMode = false }: { isEditMode?: boolean }) {
  const { t } = useI18n();

  return (
    <section
      id="about"
      className="relative overflow-hidden px-4 py-16 sm:px-8 sm:py-24"
      style={{
        background:
          "linear-gradient(180deg, #0A192F 0%, #0d2240 50%, #0A192F 100%)",
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 text-center relative">
        <div className="relative w-full overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[0_32px_90px_-28px_rgba(0,0,0,0.8)] sm:rounded-[34px] aspect-[9/16] md:aspect-video">
          <h2
            className="absolute top-[5%] md:top-[10%] left-0 w-full text-center text-4xl md:text-7xl font-light text-sand tracking-wide uppercase z-10 pointer-events-none"
            style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
          >
            {t("video.welcome")}
          </h2>
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="pointer-events-none block h-full w-full bg-black object-cover"
          >
            <source src="/0426.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}
