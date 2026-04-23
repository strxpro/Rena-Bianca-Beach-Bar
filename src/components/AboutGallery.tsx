"use client";

import { useRef, useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Pencil, X } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   STACKING CARDS — "O nas" content
   ═══════════════════════════════════════════════════════════════ */

const ABOUT_CARD_STYLES = [
  {
    number: "01",
    badgeKey: "about.card1.badge" as const,
    titleKey: "about.card1.title" as const,
    textKey: "about.card1.text" as const,
    noteKey: "about.card1.note" as const,
    bg: "radial-gradient(circle at top right, rgba(243, 201, 106, 0.24), transparent 32%), linear-gradient(140deg, #071321 0%, #102744 48%, #1d4d75 100%)",
    color: "#FDFBF7",
    accent: "rgba(243, 201, 106, 0.32)",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&h=900&fit=crop&q=80",
    showCrown: true,
    highlight: true,
  },
  {
    number: "02",
    badgeKey: "about.card2.badge" as const,
    titleKey: "about.card2.title" as const,
    textKey: "about.card2.text" as const,
    noteKey: undefined,
    bg: "radial-gradient(circle at 18% 12%, rgba(255,255,255,0.16), transparent 28%), linear-gradient(140deg, #14324f 0%, #24567d 48%, #3b82c4 100%)",
    color: "#FDFBF7",
    accent: "rgba(42, 106, 158, 0.5)",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=1200&h=900&fit=crop&q=80",
    showSun: true,
    highlight: false,
  },
  {
    number: "03",
    badgeKey: "about.card3.badge" as const,
    titleKey: "about.card3.title" as const,
    textKey: "about.card3.text" as const,
    noteKey: undefined,
    bg: "radial-gradient(circle at 82% 18%, rgba(255,255,255,0.26), transparent 26%), linear-gradient(135deg, #5ca4d5 0%, #8cc9f3 100%)",
    color: "#0A192F",
    accent: "rgba(124, 185, 232, 0.5)",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&h=900&fit=crop&q=80",
    highlight: false,
  },
  {
    number: "04",
    badgeKey: "about.card4.badge" as const,
    titleKey: "about.card4.title" as const,
    textKey: "about.card4.text" as const,
    noteKey: undefined,
    bg: "radial-gradient(circle at top left, rgba(255,255,255,0.68), transparent 32%), linear-gradient(140deg, #fdfbf7 0%, #eef4fb 52%, #dbe7f4 100%)",
    color: "#0A192F",
    accent: "rgba(243, 201, 106, 0.22)",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=900&fit=crop&q=80",
    highlight: false,
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

const CARD_TOP = "clamp(96px, 15dvh, 140px)";
const CARD_HEIGHT = "clamp(440px, 74dvh, 620px)";
const CARD_TOP_OFFSET = 20;

type DraftState = { badge: string; title: string; text: string; note: string; image: string };

export default function AboutGallery({ isEditMode = false }: { isEditMode?: boolean }) {
  const { t, overrides, setOverride } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLLIElement | null)[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftState>({ badge: "", title: "", text: "", note: "", image: "" });
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const openEdit = (i: number) => {
    const card = ABOUT_CARD_STYLES[i];
    setDraft({
      badge: t(card.badgeKey),
      title: t(card.titleKey),
      text: t(card.textKey),
      note: card.noteKey ? t(card.noteKey) : "",
      image: overrides[`about.card${i + 1}.image`] ?? card.image,
    });
    setEditIdx(i);
  };

  const applyEdit = () => {
    if (editIdx === null) return;
    const card = ABOUT_CARD_STYLES[editIdx];
    setOverride(card.badgeKey as string, draft.badge);
    setOverride(card.titleKey as string, draft.title);
    setOverride(card.textKey as string, draft.text);
    if (card.noteKey) setOverride(card.noteKey as string, draft.note);
    if (draft.image) setOverride(`about.card${editIdx + 1}.image`, draft.image);
    setEditIdx(null);
  };

  useEffect(() => {
    const syncViewport = () => setIsMobileViewport(window.innerWidth < 768);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    return () => {
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
    };
  }, []);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      cardsRef.current.forEach((card) => {
        if (!card) return;
        const wrapper = card.querySelector("[data-card-wrapper]") as HTMLElement;
        const dimOverlay = card.querySelector("[data-card-dim]") as HTMLElement;
        if (!wrapper) return;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            start: `top ${CARD_TOP}`,
            end: `bottom ${CARD_TOP}`,
            scrub: isMobileViewport ? 0.45 : 1,
            invalidateOnRefresh: true,
          },
        });

        tl.to(wrapper, {
          scale: isMobileViewport ? 0.9 : 0.85,
          y: isMobileViewport ? "-5dvh" : "-8dvh",
          rotateX: isMobileViewport ? -4 : -12,
          ease: "none",
          force3D: !isMobileViewport,
        });

        if (dimOverlay) {
          tl.to(dimOverlay, {
            opacity: 0.4,
            ease: "none",
          }, 0);
        }
      });
    },
    { scope: sectionRef, dependencies: [isMobileViewport] }
  );

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 font-body text-sm text-sand placeholder-sand/30 outline-none focus:border-ocean/50 focus:ring-1 focus:ring-ocean/30 transition-all";
  const labelClass = "mb-1.5 block text-[10px] font-medium uppercase tracking-[0.2em] text-sand/40";

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative overflow-x-clip pt-20"
      style={{
        background: "linear-gradient(180deg, #f49762 0%, #c07a52 8%, #705546 18%, #273a56 34%, #183d62 54%, #11365a 74%, #0b2038 100%)",
        minHeight: "100dvh",
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,228,177,0.18),transparent_70%)] sm:h-52" />
      <div className="pointer-events-none absolute -left-20 top-24 h-56 w-56 rounded-full bg-[#f3c96a]/12 blur-3xl sm:h-72 sm:w-72" />
      <div className="pointer-events-none absolute -right-24 bottom-24 h-64 w-64 rounded-full bg-[#153252]/45 blur-3xl sm:h-80 sm:w-80" />
      <ul
        className="relative z-10 mx-auto list-none p-0"
        style={{
          maxWidth: "min(1180px, calc(100vw - clamp(24px, 6vw, 96px)))",
          display: "grid",
          gridTemplateColumns: "1fr",
          gridTemplateRows: `repeat(${ABOUT_CARD_STYLES.length}, ${CARD_HEIGHT})`,
          gap: "clamp(14px, 4vw, 44px)",
          paddingBottom: `calc(${ABOUT_CARD_STYLES.length} * 4vw)`,
          paddingTop: "clamp(48px, 9vw, 84px)",
          paddingInline: "clamp(6px, 1.6vw, 14px)",
        }}
      >
        {ABOUT_CARD_STYLES.map((card, i) => {
          const imageKey = `about.card${i + 1}.image`;
          const imageUrl = overrides[imageKey] ?? card.image;
          return (
            <li
              key={card.number}
              ref={(el) => { cardsRef.current[i] = el; }}
              className="sticky"
              style={{
                top: CARD_TOP,
                height: CARD_HEIGHT,
                paddingTop: `${i * CARD_TOP_OFFSET}px`,
                perspective: isMobileViewport ? "none" : "1200px",
              }}
            >
              <div
                data-card-wrapper
                className="relative h-full w-full"
                style={{
                  transformOrigin: "50% 0%",
                  willChange: isMobileViewport ? "auto" : "transform",
                  transformStyle: isMobileViewport ? "flat" : "preserve-3d",
                }}
              >
                {card.showCrown && (
                  <img
                    src="/korona.svg"
                    alt=""
                    aria-hidden
                    className="pointer-events-none absolute z-30 h-[clamp(72px,14vw,140px)] w-[clamp(72px,14vw,140px)] -rotate-12 object-contain opacity-95 drop-shadow-[0_18px_30px_rgba(0,0,0,0.32)]"
                    style={{ left: "clamp(-38px, -5vw, -16px)", top: "clamp(-28px, -4vw, -10px)" }}
                  />
                )}
                <div
                  data-card-content
                  className={`relative flex h-full w-full flex-col justify-center border px-4 py-4 sm:px-8 sm:py-10 md:px-10 md:py-10 lg:px-14 lg:py-12 ${card.highlight ? "overflow-hidden border-[#f3c96a]/75 shadow-[0_36px_110px_-32px_rgba(243,201,106,0.45),0_22px_55px_-24px_rgba(0,0,0,0.6)]" : "overflow-hidden border-white/10 shadow-[0_26px_80px_-40px_rgba(3,13,24,0.78)]"}`}
                  style={{
                    background: card.bg,
                    color: card.color,
                    borderRadius: "clamp(22px, 4vw, 46px)",
                    boxShadow: card.highlight
                      ? "0 0 0 1px rgba(255, 223, 128, 0.35), inset 0 0 0 1px rgba(255, 227, 158, 0.22)"
                      : undefined,
                  }}
                >
                  {card.highlight && (
                    <>
                      <div className="pointer-events-none absolute inset-[10px] rounded-[calc(clamp(22px,4vw,46px)-10px)] border border-[#ffe4a1]/45" />
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background: "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 24%, rgba(255,255,255,0) 52%)",
                          opacity: 0.78,
                        }}
                      />
                    </>
                  )}

                  <div
                    data-card-dim
                    className="pointer-events-none absolute inset-0 rounded-[inherit] bg-black will-change-[opacity]"
                    style={{ opacity: 0, zIndex: 20 }}
                  />

                  <div
                    className="pointer-events-none absolute -right-8 top-[20%] h-32 w-32 rounded-full blur-3xl sm:h-40 sm:w-40"
                    style={{ background: card.accent, opacity: 0.95 }}
                  />

                  {/* Edit pencil button */}
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEdit(i); }}
                      className="absolute right-4 top-4 z-25 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-sm transition-all hover:bg-black/80 hover:scale-105"
                      title="Edytuj kartę"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}

                  <div className="relative z-10 flex h-full flex-col justify-between gap-5 md:flex-row md:items-center md:gap-8 lg:gap-12">
                    <div className="relative flex min-h-0 flex-1 flex-col justify-center">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-5">
                        <div
                          className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 font-body text-[10px] uppercase leading-none tracking-[0.24em] sm:text-xs ${card.highlight ? "shadow-[0_10px_30px_-18px_rgba(243,201,106,0.9)]" : ""}`}
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
                          {"showSun" in card && card.showSun && (
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
                      <h3 className="mb-3 max-w-[18ch] font-heading text-[clamp(1.8rem,5.4vw,3.85rem)] leading-[0.95] tracking-[-0.03em] md:text-5xl lg:text-6xl" style={{ fontWeight: 400 }}>
                        {t(card.titleKey)}
                      </h3>
                      <p className="max-w-2xl font-body text-sm leading-[1.65] opacity-90 sm:text-base md:text-lg lg:text-[1.15rem]">
                        {t(card.textKey)}
                      </p>
                      {card.noteKey && (
                        <p className="mt-4 max-w-2xl font-body text-[11px] leading-[1.6] text-sand/80 sm:text-sm md:text-[0.95rem]">
                          {t(card.noteKey)}
                        </p>
                      )}
                    </div>
                    <div className={`mt-1 h-[128px] w-full max-w-none shrink-0 self-end overflow-hidden rounded-[24px] border shadow-[0_24px_60px_rgba(0,0,0,0.2)] sm:mt-3 sm:h-[168px] md:mt-0 md:h-[260px] md:w-[38%] md:self-center md:rounded-[30px] lg:h-[320px] ${card.highlight ? "border-[#f3c96a]/60 md:max-w-[360px] lg:max-w-[430px]" : "border-white/15 md:max-w-[300px] lg:max-w-[360px]"}`}>
                      <img
                        src={imageUrl}
                        alt={t(card.titleKey)}
                        loading="lazy"
                        className="h-full w-full object-cover object-center transition-transform duration-700 motion-safe:hover:scale-105"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* ── Card edit modal ── */}
      {editIdx !== null && (
        <div
          className="fixed inset-0 z-350 flex items-center justify-center p-4"
          style={{ background: "rgba(5, 15, 35, 0.8)", backdropFilter: "blur(8px)" }}
        >
          <div className="w-full max-w-md overflow-y-auto rounded-[28px] border border-white/12 bg-[#0d2240] p-6 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95)]" style={{ maxHeight: "90dvh" }}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-heading text-xl text-sand">
                Edytuj kartę {ABOUT_CARD_STYLES[editIdx].number}
              </h3>
              <button
                type="button"
                onClick={() => setEditIdx(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-sand/50 hover:text-sand transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Badge</label>
                <input
                  value={draft.badge}
                  onChange={(e) => setDraft((p) => ({ ...p, badge: e.target.value }))}
                  className={inputClass}
                  placeholder="np. Must try"
                />
              </div>

              <div>
                <label className={labelClass}>Tytuł</label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                  className={inputClass}
                  placeholder="Tytuł karty"
                />
              </div>

              <div>
                <label className={labelClass}>Tekst</label>
                <textarea
                  value={draft.text}
                  onChange={(e) => setDraft((p) => ({ ...p, text: e.target.value }))}
                  className={`${inputClass} min-h-[100px] resize-y`}
                  placeholder="Opis..."
                />
              </div>

              {ABOUT_CARD_STYLES[editIdx].noteKey && (
                <div>
                  <label className={labelClass}>Notatka (dodatkowy opis)</label>
                  <textarea
                    value={draft.note}
                    onChange={(e) => setDraft((p) => ({ ...p, note: e.target.value }))}
                    className={`${inputClass} min-h-[80px] resize-y`}
                    placeholder="Dodatkowy opis..."
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>URL zdjęcia</label>
                <input
                  value={draft.image}
                  onChange={(e) => setDraft((p) => ({ ...p, image: e.target.value }))}
                  className={inputClass}
                  placeholder="https://..."
                />
                {draft.image && (
                  <div className="mt-2 overflow-hidden rounded-xl" style={{ aspectRatio: "16/9" }}>
                    <img src={draft.image} alt="podgląd" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditIdx(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-body text-sm text-sand/60 hover:text-sand transition-colors"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={applyEdit}
                className="rounded-xl bg-ocean/80 px-5 py-2.5 font-body text-sm font-medium text-white hover:bg-ocean transition-colors"
              >
                Gotowe
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
