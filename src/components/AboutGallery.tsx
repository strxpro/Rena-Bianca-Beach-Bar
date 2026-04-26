"use client";

import { useI18n } from "@/i18n/I18nProvider";

export default function AboutGallery({ isEditMode: _isEditMode = false }: { isEditMode?: boolean }) {
  const { t } = useI18n();

  return (
    <section
      id="about"
      className="relative overflow-hidden bg-[#0A192F] px-4 py-16 sm:px-8 sm:py-24"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 text-center">
        <h2
          className="font-heading text-[clamp(3.5rem,15vw,8rem)] leading-none tracking-[-0.04em] text-sand"
          style={{ fontWeight: 400 }}
        >
          {t("about.invite.heading")}
        </h2>

        <div className="w-full overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[0_32px_90px_-28px_rgba(0,0,0,0.8)] sm:rounded-[34px]">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="pointer-events-none block aspect-video w-full bg-black object-cover"
          >
            <source src="/filmrena.mp4" type="video/mp4" />
            {t("about.invite.heading")}
          </video>
        </div>
      </div>
    </section>
  );
}
