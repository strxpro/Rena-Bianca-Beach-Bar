"use client";

import { useRef, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   STACKING CARDS — "O nas" content
   ─────────────────────────────────────────────────────────────
   Sticky cards stack on top of each other as the user scrolls.
   When a card scrolls past the top, it scales down, tilts back
   (3D perspective), and dims — revealing the next card beneath.
   Adapted from CSS-only stacking cards CodePen, using GSAP
   ScrollTrigger for cross-browser support.
   ═══════════════════════════════════════════════════════════════ */

const ABOUT_CARD_STYLES = [
  {
    number: "01",
    badgeKey: "about.card1.badge" as const,
    titleKey: "about.card1.title" as const,
    textKey: "about.card1.text" as const,
    noteKey: "about.card1.note" as const,
    bg: "linear-gradient(135deg, #0A192F 0%, #1a3a5c 100%)",
    color: "#FDFBF7",
    accent: "rgba(59, 130, 196, 0.4)",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&h=900&fit=crop&q=80",
    showCrown: true,
    highlight: true,
  },
  {
    number: "02",
    badgeKey: "about.card2.badge" as const,
    titleKey: "about.card2.title" as const,
    textKey: "about.card2.text" as const,
    bg: "linear-gradient(135deg, #1a3a5c 0%, #2a6a9e 100%)",
    color: "#FDFBF7",
    accent: "rgba(42, 106, 158, 0.5)",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=1200&h=900&fit=crop&q=80",
    showSun: true,
  },
  {
    number: "03",
    badgeKey: "about.card3.badge" as const,
    titleKey: "about.card3.title" as const,
    textKey: "about.card3.text" as const,
    bg: "linear-gradient(135deg, #3B82C4 0%, #7CB9E8 100%)",
    color: "#0A192F",
    accent: "rgba(124, 185, 232, 0.5)",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&h=900&fit=crop&q=80",
  },
  {
    number: "04",
    badgeKey: "about.card4.badge" as const,
    titleKey: "about.card4.title" as const,
    textKey: "about.card4.text" as const,
    bg: "linear-gradient(135deg, #FDFBF7 0%, #e8f0f8 100%)",
    color: "#0A192F",
    accent: "rgba(253, 251, 247, 0.6)",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=900&fit=crop&q=80",
  },
];

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path d="M12 2v3M12 19v3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M2 12h3M19 12h3M4.9 19.1l2.2-2.2M16.9 7.1l2.2-2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* Sticky top for the stacking cards.
   – On desktop the cards sit at 12dvh (nice "floating" look under the nav).
   – On mobile the fixed <Header /> is 72 px; 12dvh on a 750 px phone is
     only 90 px, which means the card heading ends up sitting right
     under the logo with no breathing room and visually appears to
     start ABOVE the section (the user's complaint). We drop the
     sticky position lower on phones (`clamp(96px, 15dvh, 140px)`) so
     the card clears the header and sits inside its own section. */
const CARD_TOP = "clamp(112px, 15dvh, 160px)";
const CARD_TOP_OFFSET = 20; // px between stacked cards

export default function AboutGallery() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLLIElement | null)[]>([]);

  // #region agent log
  useEffect(() => {
  }, []);
  // #endregion

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      cardsRef.current.forEach((card) => {
        if (!card) return;
        const content = card.querySelector("[data-card-content]") as HTMLElement;
        const dimOverlay = card.querySelector("[data-card-dim]") as HTMLElement;
        if (!content) return;

        ScrollTrigger.create({
          trigger: card,
          start: `top ${CARD_TOP}`,
          end: `bottom ${CARD_TOP}`,
          scrub: 1,
          onUpdate: (self) => {
            const p = self.progress;
            // GPU-accelerated: only transform + opacity
            content.style.transform = `scale(${1 - p * 0.15}) translateY(${-p * 8}dvh) rotateX(${-12 * p}deg)`;
            if (dimOverlay) dimOverlay.style.opacity = `${p * 0.4}`;
          },
        });
      });
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative pt-20"
      style={{
        background: "linear-gradient(to bottom, #ff8855 0%, #cc7744 5%, #8a6040 12%, #3a4a6e 25%, #2a6a9e 40%, #3a7ab0 50%, #3a7ab0 90%, #2a6a9e 100%)",
        /* Guarantee the About section is its OWN scroll window. Without
           a min-height the `<ul>`'s inline grid was the sole source of
           height and, because the first `<li>` is `position: sticky`,
           the first card started sticking the moment its parent grid
           cell entered the viewport — i.e. the very first pixel of
           the section. On phones that made the first card appear
           over the end of the hero parallax ("za wysoko, nie w swojej
           sekcji"). A `min-h-dvh` wrapper forces at least one full
           viewport of the section to scroll past before the next
           section can intrude. */
        minHeight: "100dvh",
      }}
    >
      <ul
        className="mx-auto list-none p-0"
        style={{
          maxWidth: "90vw",
          display: "grid",
          gridTemplateColumns: "1fr",
          gridTemplateRows: `repeat(${ABOUT_CARD_STYLES.length}, clamp(300px, 55dvh, 540px))`,
          gap: "clamp(12px, 4vw, 40px)",
          paddingBottom: `calc(${ABOUT_CARD_STYLES.length} * 4vw)`,
          /* Bigger breathing room on phones so the first card starts
             a clear distance below the header + the end of the hero
             parallax, matching the generous spacing we have on desktop. */
          paddingTop: "clamp(56px, 10vw, 80px)",
        }}
      >
        {ABOUT_CARD_STYLES.map((card, i) => (
          <li
            key={card.number}
            ref={(el) => { cardsRef.current[i] = el; }}
            className="sticky"
            style={{
              top: CARD_TOP,
              height: "clamp(300px, 55dvh, 540px)",
              paddingTop: `${i * CARD_TOP_OFFSET}px`,
              perspective: "1000px",
            }}
          >
            <div
              data-card-content
              className={`relative flex h-full w-full flex-col justify-center border px-5 py-6 sm:px-8 sm:py-10 md:px-14 md:py-14 ${card.highlight ? "overflow-visible border-[#f3c96a]/80 shadow-[0_28px_90px_-24px_rgba(243,201,106,0.55),0_18px_40px_-18px_rgba(0,0,0,0.45)]" : "overflow-hidden border-white/10"}`}
              style={{
                background: card.bg,
                color: card.color,
                borderRadius: "clamp(20px, 4vw, 50px)",
                transformOrigin: "50% 0%",
                willChange: "transform",
                transformStyle: "preserve-3d",
                boxShadow: card.highlight
                  ? "0 0 0 1px rgba(255, 223, 128, 0.35), inset 0 0 0 1px rgba(255, 227, 158, 0.22)"
                  : undefined,
              }}
            >
              {card.highlight && (
                <div className="pointer-events-none absolute inset-[10px] rounded-[calc(clamp(20px,4vw,50px)-10px)] border border-[#ffe4a1]/45" />
              )}

              {/* Dim overlay — GPU-accelerated opacity only (replaces filter:brightness + box-shadow) */}
              <div
                data-card-dim
                className="pointer-events-none absolute inset-0 rounded-[inherit] bg-black will-change-[opacity]"
                style={{ opacity: 0, zIndex: 20 }}
              />

              <div
                className="pointer-events-none absolute -right-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full blur-3xl"
                style={{ background: card.accent, opacity: 0.9 }}
              />


              <div className="relative z-10 flex h-full flex-col justify-between gap-4 md:flex-row md:items-center md:gap-8 lg:gap-12">
                <div className="flex flex-1 flex-col justify-center min-h-0">
                  {card.showCrown && (
                    <img
                      src="/korona.svg"
                      alt=""
                      aria-hidden
                      className="pointer-events-none absolute -left-7 -top-9 z-30 h-16 w-16 -rotate-12 drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)] sm:-left-9 sm:-top-11 sm:h-20 sm:w-20 md:h-24 md:w-24"
                    />
                  )}
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-body text-[10px] uppercase tracking-[0.24em] sm:text-xs ${card.highlight ? "shadow-[0_10px_30px_-18px_rgba(243,201,106,0.9)]" : ""}`}
                      style={{
                        borderColor: card.highlight
                          ? "rgba(243, 201, 106, 0.8)"
                          : card.color === "#0A192F"
                            ? "rgba(10, 25, 47, 0.18)"
                            : "rgba(255, 255, 255, 0.2)",
                        background: card.highlight
                          ? "linear-gradient(135deg, rgba(255,244,200,0.18), rgba(243,201,106,0.28))"
                          : card.color === "#0A192F"
                            ? "rgba(10, 25, 47, 0.06)"
                            : "rgba(255, 255, 255, 0.08)",
                        color: card.highlight ? "#ffe9b4" : card.color,
                      }}
                    >
                      {card.showSun && (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                          <SunIcon />
                        </span>
                      )}
                      <span>{t(card.badgeKey)}</span>
                    </div>
                    <span className="font-body text-[10px] uppercase tracking-[0.3em] opacity-45 sm:text-xs">
                      {card.number}
                    </span>
                  </div>
                  <h3 className="mb-3 max-w-xl font-heading text-2xl sm:text-3xl md:text-5xl lg:text-6xl" style={{ fontWeight: 400 }}>
                    {t(card.titleKey)}
                  </h3>
                  <p className="max-w-xl font-body text-sm leading-relaxed opacity-85 sm:text-base md:text-lg lg:text-xl">
                    {t(card.textKey)}
                  </p>
                  {card.noteKey && (
                    <p className="mt-4 max-w-xl font-body text-xs leading-relaxed text-sand/75 sm:text-sm md:text-base">
                      {t(card.noteKey)}
                    </p>
                  )}
                </div>
                <div className={`mt-2 h-[148px] w-full shrink-0 self-end overflow-hidden rounded-[28px] border shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:mt-4 sm:h-[180px] sm:max-w-xs md:mt-0 md:h-auto md:self-auto ${card.highlight ? "max-w-[220px] border-[#f3c96a]/65 md:max-w-[280px] lg:max-w-[420px]" : "max-w-[200px] border-white/15 md:max-w-[240px] lg:max-w-sm"}`}>
                  <img
                    src={card.image}
                    alt={t(card.titleKey)}
                    loading="lazy"
                    className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
