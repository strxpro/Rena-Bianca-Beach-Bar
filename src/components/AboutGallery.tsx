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
    titleKey: "about.card1.title" as const,
    textKey: "about.card1.text" as const,
    bg: "linear-gradient(135deg, #0A192F 0%, #1a3a5c 100%)",
    color: "#FDFBF7",
    accent: "rgba(59, 130, 196, 0.4)",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop&q=80",
  },
  {
    number: "02",
    titleKey: "about.card2.title" as const,
    textKey: "about.card2.text" as const,
    bg: "linear-gradient(135deg, #1a3a5c 0%, #2a6a9e 100%)",
    color: "#FDFBF7",
    accent: "rgba(42, 106, 158, 0.5)",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&h=600&fit=crop&q=80",
  },
  {
    number: "03",
    titleKey: "about.card3.title" as const,
    textKey: "about.card3.text" as const,
    bg: "linear-gradient(135deg, #3B82C4 0%, #7CB9E8 100%)",
    color: "#0A192F",
    accent: "rgba(124, 185, 232, 0.5)",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&h=600&fit=crop&q=80",
  },
  {
    number: "04",
    titleKey: "about.card4.title" as const,
    textKey: "about.card4.text" as const,
    bg: "linear-gradient(135deg, #FDFBF7 0%, #e8f0f8 100%)",
    color: "#0A192F",
    accent: "rgba(253, 251, 247, 0.6)",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80",
  },
];

/* Sticky top for the stacking cards.
   – On desktop the cards sit at 12vh (nice "floating" look under the nav).
   – On mobile the fixed <Header /> is 72 px; 12vh on a 750 px phone is
     only 90 px, which means the card heading ends up sitting right
     under the logo with no breathing room and visually appears to
     start ABOVE the section (the user's complaint). We drop the
     sticky position lower on phones (`clamp(96px, 15vh, 140px)`) so
     the card clears the header and sits inside its own section. */
const CARD_TOP = "clamp(96px, 15vh, 140px)";
const CARD_TOP_OFFSET = 20; // px between stacked cards

export default function AboutGallery() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLLIElement | null)[]>([]);

  // #region agent log
  useEffect(() => {
    const send = () => {
      const sect = sectionRef.current;
      if (!sect) return;
      const firstCard = cardsRef.current[0];
      const prev = sect.previousElementSibling as HTMLElement | null;
      const sr = sect.getBoundingClientRect();
      const fc = firstCard?.getBoundingClientRect();
      const pv = prev?.getBoundingClientRect();
      fetch('http://127.0.0.1:7448/ingest/e851fae5-0f43-4007-a667-b05ec1b0c1b7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '5e042f' },
        body: JSON.stringify({
          sessionId: '5e042f',
          runId: 'run1',
          hypothesisId: 'H6',
          location: 'AboutGallery.tsx:mount',
          message: 'about layout measure',
          data: {
            vw: window.innerWidth,
            vh: window.innerHeight,
            headerH: (document.querySelector('header') as HTMLElement | null)?.offsetHeight ?? null,
            section: { offsetTop: sect.offsetTop, h: Math.round(sr.height), scrollH: sect.scrollHeight, rectTop: Math.round(sr.top) },
            firstCard: fc ? { topRel: Math.round(fc.top - sr.top), h: Math.round(fc.height) } : null,
            prevSibling: prev && pv ? { tag: prev.tagName, id: prev.id, bottom: Math.round(pv.bottom), h: Math.round(pv.height) } : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    };
    const t = window.setTimeout(send, 800);
    return () => window.clearTimeout(t);
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
            content.style.transform = `scale(${1 - p * 0.15}) translateY(${-p * 8}vh) rotateX(${-12 * p}deg)`;
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
      className="relative"
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
          gridTemplateRows: `repeat(${ABOUT_CARD_STYLES.length}, clamp(300px, 55vh, 540px))`,
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
              height: "clamp(300px, 55vh, 540px)",
              paddingTop: `${i * CARD_TOP_OFFSET}px`,
              perspective: "1000px",
            }}
          >
            <div
              data-card-content
              className="relative flex h-full w-full flex-col justify-center overflow-hidden border border-white/10 px-5 py-6 sm:px-8 sm:py-10 md:px-14 md:py-14"
              style={{
                background: card.bg,
                color: card.color,
                borderRadius: "clamp(20px, 4vw, 50px)",
                transformOrigin: "50% 0%",
                willChange: "transform",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Dim overlay — GPU-accelerated opacity only (replaces filter:brightness + box-shadow) */}
              <div
                data-card-dim
                className="pointer-events-none absolute inset-0 rounded-[inherit] bg-black will-change-[opacity]"
                style={{ opacity: 0, zIndex: 20 }}
              />


              <div className="relative z-10 flex h-full flex-col md:flex-row md:items-center md:gap-8 lg:gap-12">
                <div className="flex flex-1 flex-col justify-center">
                  <h3 className="mb-3 font-heading text-2xl sm:text-3xl md:text-5xl lg:text-6xl" style={{ fontWeight: 400 }}>
                    {t(card.titleKey)}
                  </h3>
                  <p className="max-w-xl font-body text-sm leading-relaxed opacity-80 sm:text-base md:text-lg lg:text-xl">
                    {t(card.textKey)}
                  </p>
                </div>
                <div className="mt-4 aspect-video w-full max-w-[200px] shrink-0 overflow-hidden rounded-2xl shadow-xl sm:mt-6 sm:aspect-4/3 sm:max-w-xs md:mt-0 md:rounded-3xl lg:max-w-sm">
                  <img
                    src={card.image}
                    alt={t(card.titleKey)}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
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
