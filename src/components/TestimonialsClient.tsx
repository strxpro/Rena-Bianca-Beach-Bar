"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { createPortal } from "react-dom";
import { Turnstile } from "@marsidev/react-turnstile";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";

/* ═══════════════════════════════════════════════════════════════
   TESTIMONIALS — Aceternity HeroParallax layout mechanism applied
   to guest review sticker cards. The container is 300vh tall; as
   the user scrolls through it three staggered rows slide
   horizontally in alternating directions (row 1 & 3 right, row 2
   left) while the whole stack performs a single 3D entrance
   (rotateX / rotateZ unwind, translateY lifts, opacity fades up).
   All pop-up UX, form logic and i18n are untouched — only the
   layout/scroll mechanism was swapped.
   ═══════════════════════════════════════════════════════════════ */

export type Review = {
  name: string;
  role: string;
  date: string;
  text: string;
  rating: number;
  photo: string;
  isLocal?: boolean;
};

/* ── Sticker aesthetics: slight rotation + colored tape per card ── */
const STICKER_TILTS = [-3.5, 2.5, -1.8, 3, -2.2, 1.2, -4, 2.8, -1, 3.4];
const TAPE_COLORS = [
  "rgba(253,251,247,0.55)",   // cream
  "rgba(124,185,232,0.55)",   // sky
  "rgba(255,200,90,0.5)",     // amber
  "rgba(200,230,255,0.55)",   // pale blue
  "rgba(253,232,190,0.55)",   // sand
];

/* ── Stars component ── */
function Stars({ count, size = "sm" }: { count: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`${cls} ${i < count ? "text-amber-400" : "text-white/10"}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 1l2.39 4.84L17.5 6.9l-3.75 3.66.89 5.17L10 13.38l-4.64 2.35.89-5.17L2.5 6.9l5.11-1.06L10 1z" />
        </svg>
      ))}
    </div>
  );
}

/* ── Single review "sticker" card (polaroid / post-it style) ──
      `translate` is the scroll-driven MotionValue that pushes the
      card along the X-axis — each row passes a different source
      (translateX / translateXReverse) so rows 1 & 3 drift right
      while row 2 drifts left as the user scrolls. That's the
      parallax beat borrowed straight from Aceternity's
      HeroParallax. `rotate: tilt` stays in the same style object
      so the sticker's natural post-it tilt is preserved on top of
      the X translation. */
function ReviewCard({
  review,
  onClick,
  tilt = 0,
  tapeColor = "rgba(253,251,247,0.55)",
}: {
  review: Review;
  onClick: () => void;
  tilt?: number;
  tapeColor?: string;
}) {
  return (
    <motion.div
      style={{ rotate: tilt }}
      whileHover={{ y: -10, rotate: 0, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group/review relative h-[320px] w-[260px] sm:h-[400px] sm:w-[320px] shrink-0 cursor-pointer"
      onClick={onClick}
    >
      {/* ── Polaroid frame ── */}
      <div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-[8px] bg-[#FDFBF7] p-3 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55),0_4px_10px_rgba(0,0,0,0.25)] transition-shadow duration-300 group-hover/review:shadow-[0_26px_60px_-12px_rgba(0,0,0,0.7),0_6px_14px_rgba(0,0,0,0.35)] sm:p-4"
      >
        {/* ── Tape strip across the top ── */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-2 left-1/2 z-10 h-6 w-24 -translate-x-1/2 -rotate-2 shadow-md sm:w-28"
          style={{
            background: `linear-gradient(180deg, ${tapeColor} 0%, rgba(253,251,247,0.25) 100%)`,
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        />

        {/* Photo */}
        <div className="relative h-[60%] w-full overflow-hidden rounded-[4px] bg-navy/5">
          <img
            src={review.photo}
            alt={review.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover/review:scale-[1.04]"
            draggable={false}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          {/* subtle warm photo tint */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_60%)]" />
        </div>
        {/* Handwritten caption */}
        <div className="flex flex-1 flex-col justify-between px-1 pb-1 pt-3 sm:px-2 sm:pt-4 relative">
          <div>
            <Stars count={review.rating} />
            <p className="mt-2 line-clamp-3 font-body text-[13px] leading-snug text-navy/80 sm:text-[14px]">
              &ldquo;{review.text}&rdquo;
            </p>
            <div className="mt-2 flex items-center justify-between">
              {review.isLocal && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-50/80 px-2 py-0.5 shadow-[inset_0_0_8px_rgba(251,191,36,0.3)] backdrop-blur-sm">
                  <svg className="h-3 w-3 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-body text-[9px] font-semibold uppercase tracking-wider text-amber-700/90">Ospite Verificato</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="min-w-0 truncate font-heading text-[14px] text-navy sm:text-lg" style={{ fontWeight: 500 }}>
              — {review.name}
            </p>
            <span className="font-body text-[10px] tabular-nums text-navy/30">
              {review.date}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

function cleanReviewText(text: string) {
  if (!text) return "";
  let cleaned = text.replace(/\(Translated by Google\)/gi, "");
  if (cleaned.toLowerCase().includes("(original)")) {
    const splitIndex = cleaned.toLowerCase().indexOf("(original)");
    cleaned = cleaned.substring(0, splitIndex);
  }
  return cleaned.trim();
}

export default function TestimonialsClient({ initialReviews = [] }: { initialReviews?: Review[] }) {
  const { t } = useI18n();
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const cleanedReviews = React.useMemo(() => {
    return [
      ...initialReviews.map(r => ({ ...r, text: cleanReviewText(r.text) })),
      ...localReviews,
    ];
  }, [initialReviews, localReviews]);

  const ref = useRef<HTMLDivElement>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showWrite, setShowWrite] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /* Write-form state */
  const [activeTab, setActiveTab] = useState<"local" | "google">("local");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const formOpenTimeRef = useRef<number>(Date.now());

  const getAnonymizedName = (name: string) => {
    if (!name.trim()) return "";
    return name
      .trim()
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + ".")
      .join(" ");
  };

  const getAvatarUrl = (name: string) => {
    return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(name || "default")}`;
  };

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 };
  const translateX = useSpring(useTransform(scrollYProgress, [0, 1], [300, -800]), springConfig);
  const translateXReverse = useSpring(useTransform(scrollYProgress, [0, 1], [-800, 300]), springConfig);
  
  // 3D transforms apply as the section reveals. Unwind smoothly by the time it reaches the center viewport.
  const rotateX = useSpring(useTransform(scrollYProgress, [0, 0.4], [15, 0]), springConfig);
  const opacity = useSpring(useTransform(scrollYProgress, [0, 0.2], [0.3, 1]), springConfig);
  const rotateZ = useSpring(useTransform(scrollYProgress, [0, 0.4], [8, 0]), springConfig);
  const translateY = useSpring(useTransform(scrollYProgress, [0, 0.4], [-150, 0]), springConfig);

  // Duplicate 4 times to render 20 per row and create a massive horizontal run-way
  const firstRow = [...cleanedReviews.slice(0, 5), ...cleanedReviews.slice(0, 5), ...cleanedReviews.slice(0, 5), ...cleanedReviews.slice(0, 5)];
  const secondRow = [...cleanedReviews.slice(5, 10), ...cleanedReviews.slice(5, 10), ...cleanedReviews.slice(5, 10), ...cleanedReviews.slice(5, 10)];
  const thirdRow = [...cleanedReviews.slice(10, 15), ...cleanedReviews.slice(10, 15), ...cleanedReviews.slice(10, 15), ...cleanedReviews.slice(10, 15)];

  const openReview = useCallback((r: Review) => {
    setSelectedReview(r);
    document.body.style.overflow = "hidden";
  }, []);
  const closeReview = useCallback(() => {
    setSelectedReview(null);
    document.body.style.overflow = "";
  }, []);

  const openShowAll = useCallback(() => {
    setShowAll(true);
    document.body.style.overflow = "hidden";
  }, []);
  const closeShowAll = useCallback(() => {
    setShowAll(false);
    document.body.style.overflow = "";
  }, []);

  const openWrite = useCallback(() => {
    formOpenTimeRef.current = Date.now();
    setShowWrite(true);
    document.body.style.overflow = "hidden";
  }, []);
  const closeWrite = useCallback(() => {
    setShowWrite(false);
    document.body.style.overflow = "";
  }, []);

  const submitReview = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formText.trim()) return;
    setFormStatus("sending");
    try {
      const finalName = isAnonymous ? getAnonymizedName(formName) : formName.trim();
      const finalAvatar = getAvatarUrl(formName);
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          rating: formRating,
          text: formText.trim(),
          avatar: finalAvatar,
          photoBase64: photoBase64 || undefined,
          token: turnstileToken,
          hp: honeypot,
          formLoadedAt: formOpenTimeRef.current,
        }),
      });
      if (!res.ok) throw new Error("api failed");
      setLocalReviews(prev => [{
        name: finalName,
        role: "",
        date: new Date().toISOString().split("T")[0],
        text: formText.trim(),
        rating: formRating,
        photo: finalAvatar,
        isLocal: true,
      }, ...prev]);
      setFormStatus("sent");
      setFormName("");
      setFormText("");
      setFormRating(5);
      setIsAnonymous(false);
      setPhotoBase64("");
      setPhotoPreview("");
      window.setTimeout(() => {
        closeWrite();
        setFormStatus("idle");
        setActiveTab("local");
      }, 1600);
    } catch {
      setFormStatus("error");
    }
  }, [formName, formRating, formText, isAnonymous, closeWrite, turnstileToken, honeypot, photoBase64]);

  return (
    <>
      <div
        id="testimonials"
        ref={ref}
        className="relative antialiased flex flex-col justify-start overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32 [perspective:1000px] [transform-style:preserve-3d]"
        style={{
          background: "linear-gradient(180deg, #0A192F 0%, #0d2240 20%, #1a4a6e 55%, #5ba3d9 80%, #8ec5e8 100%)",
        }}
      >
        {/* ── Header ── */}
        <div data-testi-header className="relative mx-auto w-full max-w-7xl px-4 mb-20 md:mb-40 text-center z-40">
          <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.25em] text-sand/50 sm:mb-3 sm:text-xs sm:tracking-[0.3em]">
            {t("testimonials.label")}
          </span>
          <h2 className="font-heading text-4xl text-white font-bold sm:text-5xl md:text-7xl">
            {t("testimonials.heading")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-sm leading-relaxed text-white/70 sm:mt-6 sm:text-base md:text-xl">
            {t("testimonials.description")}
          </p>
        </div>

        {/* ── 3D Grid ── */}
        <motion.div
           style={{
             rotateX,
             rotateZ,
             translateY,
             opacity,
           }}
           className="relative z-10 flex flex-col gap-6 sm:gap-12 w-full items-center pointer-events-auto"
         >
           <motion.div style={{ x: translateX }} drag="x" dragConstraints={{ left: -2000, right: 2000 }} className="flex flex-row space-x-6 sm:space-x-12 mb-4 w-max cursor-grab active:cursor-grabbing px-[5vw] sm:px-[10vw] will-change-transform">
             {firstRow.map((r, i) => (
               <div key={`${r.name}-${i}-1`} className="shrink-0 flex items-center justify-center">
                 <ReviewCard
                   review={r}
                   onClick={() => openReview(r)}
                   tilt={STICKER_TILTS[i % STICKER_TILTS.length]}
                   tapeColor={TAPE_COLORS[i % TAPE_COLORS.length]}
                 />
               </div>
             ))}
           </motion.div>
           
           <motion.div style={{ x: translateXReverse }} drag="x" dragConstraints={{ left: -2000, right: 2000 }} className="flex flex-row space-x-6 sm:space-x-12 mb-4 w-max cursor-grab active:cursor-grabbing xl:-ml-[400px] ml-[-200px] px-[5vw] sm:px-[10vw] will-change-transform">
             {secondRow.map((r, i) => (
               <div key={`${r.name}-${i}-2`} className="shrink-0 flex items-center justify-center">
                 <ReviewCard
                   review={r}
                   onClick={() => openReview(r)}
                   tilt={STICKER_TILTS[(i + 5) % STICKER_TILTS.length]}
                   tapeColor={TAPE_COLORS[(i + 5) % TAPE_COLORS.length]}
                 />
               </div>
             ))}
           </motion.div>
           
           <motion.div style={{ x: translateX }} drag="x" dragConstraints={{ left: -2000, right: 2000 }} className="flex flex-row space-x-6 sm:space-x-12 w-max cursor-grab active:cursor-grabbing px-[5vw] sm:px-[10vw]">
             {thirdRow.map((r, i) => (
               <div key={`${r.name}-${i}-3`} className="shrink-0 flex items-center justify-center">
                 <ReviewCard
                   review={r}
                   onClick={() => openReview(r)}
                   tilt={STICKER_TILTS[(i + 10) % STICKER_TILTS.length]}
                   tapeColor={TAPE_COLORS[(i + 10) % TAPE_COLORS.length]}
                 />
               </div>
             ))}
           </motion.div>
         </motion.div>

        {/* ── CTA Buttons ── */}
        <div data-testi-cta className="relative z-40 mx-auto w-full max-w-xl flex flex-col items-center justify-center md:flex-row space-y-4 md:space-y-0 md:space-x-4 px-4 mt-20 sm:mt-28">
          <button
            onClick={openShowAll}
            className="group/seeall relative inline-flex select-none items-center justify-center px-4 py-2 font-body text-sm font-medium uppercase tracking-[0.18em] text-sand transition-colors duration-300 hover:text-white sm:text-[15px] md:text-base mr-4 md:mr-0"
          >
            <span className="relative z-10">{t("testimonials.cta.button")}</span>
            <span className="pointer-events-none absolute inset-x-0 -bottom-1 h-3 text-ocean/90">
              <svg viewBox="0 0 310 40" fill="none" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                <path
                  d="M5 21C26.8 16.2 49.6 11.6 71.8 14.7C85 16.5 97 21.8 110 24.4C116.4 25.7 123 25.5 129 22.6C136 19.3 142.6 15.1 150.1 13.3C156.8 11.7 161.7 14.6 167.9 16.8C181.6 21.7 195 22.6 209.3 21.4C224.7 20.1 239.9 18 255.4 18.3C272 18.6 288.4 18.9 305 18"
                  pathLength={100}
                  className="fill-none stroke-current stroke-6 [stroke-dasharray:100] [stroke-dashoffset:100] transition-[stroke-dashoffset] duration-500 ease-out group-hover/seeall:[stroke-dashoffset:0]"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </button>

          <button
            type="button"
            onClick={openWrite}
            className="inline-flex items-center justify-center rounded-full border border-sand/30 bg-sand/10 px-8 py-3.5 font-heading text-lg text-sand backdrop-blur-sm transition-all duration-300 hover:border-sand/50 hover:bg-sand/20 sm:px-10 sm:py-4 sm:text-xl shadow-lg"
            style={{ fontWeight: 400 }}
          >
            {t("testimonials.cta.heading")}
          </button>
        </div>
      </div>

      {/* ═══ POPUPS rendered via portal to avoid extension DOM conflicts ═══ */}
      {mounted && createPortal(
        <>
          {/* ═══ SINGLE REVIEW POPUP ═══ */}
          <AnimatePresence>
            {selectedReview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-md"
                onClick={closeReview}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 30, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 30, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d2240] shadow-2xl"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  {/* Photo banner */}
                  <div className="relative h-40 w-full overflow-hidden">
                    <img src={selectedReview.photo} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    <div className="absolute inset-0 bg-linear-to-t from-[#0d2240] via-transparent to-transparent" />
                  </div>
                  {/* Close */}
                  <button
                    onClick={closeReview}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                  {/* Content */}
                  <div className="-mt-8 relative z-10 px-6 pb-8">
                    <div className="flex items-end gap-4">
                      <img src={selectedReview.photo} alt="" className="h-16 w-16 rounded-full border-2 border-[#0d2240] object-cover shadow-lg" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      <div>
                        <p className="font-heading text-lg text-sand">{selectedReview.name}</p>
                        <p className="font-body text-xs text-sand/40">{selectedReview.date}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Stars count={selectedReview.rating} size="lg" />
                    </div>
                    <p className="mt-4 font-body text-base leading-relaxed text-sand/80">
                      &ldquo;{selectedReview.text}&rdquo;
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ ALL REVIEWS MASONRY POPUP ═══ */}
          <AnimatePresence>
            {showAll && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-9999 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-lg"
                onClick={closeShowAll}
              >
                {/* Close */}
                <button
                  onClick={closeShowAll}
                  className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 md:right-8 md:top-8"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>

                <div className="w-full max-w-6xl px-4 py-16 md:px-8" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  {/* Popup heading */}
                  <div className="mb-10 text-center">
                    <span className="mb-2 block font-body text-xs uppercase tracking-[0.3em] text-sand/40">
                      {t("testimonials.popup.label")}
                    </span>
                    <h3 className="font-heading text-3xl text-sand md:text-5xl" style={{ fontWeight: 400 }}>
                      {t("testimonials.popup.heading")}
                    </h3>
                  </div>

                  {/* Sort controls — prosta sortowalność, bez filtrów kategorii */}
                  <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
                    {(["newest", "oldest", "highest", "lowest"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSortBy(s)}
                        className={`rounded-full border px-4 py-1.5 font-body text-xs tracking-wide transition-all duration-200
                          ${sortBy === s ? "border-ocean bg-ocean/20 text-sand" : "border-white/15 bg-white/5 text-sand/50 hover:border-white/30 hover:text-sand/80"}`}
                      >
                        {t(`testimonials.sort.${s}` as Parameters<typeof t>[0])}
                      </button>
                    ))}
                  </div>

                  {/* Masonry grid */}
                  <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                    {[...cleanedReviews]
                      .sort((a, b) => {
                        if (sortBy === "newest") return b.date.localeCompare(a.date);
                        if (sortBy === "oldest") return a.date.localeCompare(b.date);
                        if (sortBy === "highest") return b.rating - a.rating || b.date.localeCompare(a.date);
                        return a.rating - b.rating || b.date.localeCompare(a.date);
                      })
                      .map((review, i) => (
                      <motion.div
                        key={review.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.4 }}
                        className="mb-4 break-inside-avoid cursor-pointer rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 hover:border-ocean/30 hover:bg-white/10"
                        onClick={() => { setShowAll(false); setSelectedReview(review); }}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={review.photo}
                            alt={review.name}
                            className="h-10 w-10 rounded-full border border-sand/20 object-cover"
                            draggable={false}
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                          <p className="font-body text-sm font-medium text-sand">{review.name}</p>
                          <span className="ml-auto font-body text-[10px] text-sand/30">{review.date}</span>
                        </div>
                        <div className="mt-3">
                          <Stars count={review.rating} />
                        </div>
                        <p className="mt-3 font-body text-sm leading-relaxed text-sand/70">
                          &ldquo;{review.text}&rdquo;
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Bottom message */}
                  <div className="mt-12 text-center">
                    <p className="font-body text-sm text-sand/40">
                      {t("testimonials.popup.bottom")}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ WRITE-A-REVIEW POPUP ═══ */}
          <AnimatePresence>
            {showWrite && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                onClick={() => setShowWrite(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 30, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 30, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d2240] p-6 shadow-2xl sm:p-8"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setShowWrite(false)}
                    className="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60"
                    aria-label="Close"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>

                  <div className="mb-5 text-center sm:mb-6">
                    <span className="mb-1 block font-body text-[10px] uppercase tracking-[0.3em] text-sand/40">
                      {t("testimonials.label")}
                    </span>
                    <h3 className="font-heading text-2xl text-sand sm:text-3xl" style={{ fontWeight: 400 }}>
                      {t("testimonials.cta.heading")}
                    </h3>
                  </div>

                  {/* TABS */}
                  <div className="mb-6 flex rounded-lg bg-white/5 p-1">
                    <button
                      onClick={() => setActiveTab("local")}
                      className={`flex-1 rounded-md py-2.5 text-center font-body text-[13px] font-medium transition-all ${
                        activeTab === "local" ? "bg-ocean/80 text-white shadow-[0_2px_10px_rgba(0,0,0,0.1)]" : "text-sand/50 hover:text-sand hover:bg-white/5"
                      }`}
                    >
                      Recensione Locale
                    </button>
                    <button
                      onClick={() => setActiveTab("google")}
                      className={`flex-1 rounded-md py-2.5 text-center font-body text-[13px] font-medium transition-all ${
                        activeTab === "google" ? "bg-blue-600 text-white shadow-[0_2px_10px_rgba(0,0,0,0.1)]" : "text-sand/50 hover:text-sand hover:bg-white/5"
                      }`}
                    >
                      Recensione su Google
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === "local" ? (
                      <motion.form
                        key="local"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        onSubmit={submitReview}
                        className="space-y-4 sm:space-y-5"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={getAvatarUrl(formName)}
                            alt="Avatar preview"
                            className="h-14 w-14 rounded-full border border-ocean/40 bg-[#0A192F] object-cover shadow-lg"
                          />
                          <div className="flex-1">
                            <label className="mb-1 block font-body text-[11px] uppercase tracking-[0.18em] text-sand/50">
                              {t("contact.name") || "Nome"}
                            </label>
                            <input
                              type="text"
                              required
                              value={formName}
                              onChange={(e) => setFormName(e.target.value)}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-body text-sm text-sand placeholder:text-sand/30 focus:border-ocean/60 focus:bg-white/10 focus:outline-none"
                              placeholder="Jan Kowalski"
                            />
                          </div>
                        </div>

                        <label className="group flex cursor-pointer items-center gap-2.5 pt-1">
                          <div className="relative flex h-4 w-4 items-center justify-center rounded-[4px] border border-white/20 bg-white/5 transition-colors group-hover:border-white/40">
                            <input
                              type="checkbox"
                              checked={isAnonymous}
                              onChange={(e) => setIsAnonymous(e.target.checked)}
                              className="peer sr-only"
                            />
                            <svg
                              className="h-3 w-3 text-ocean opacity-0 transition-opacity peer-checked:opacity-100"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <span className="font-body text-xs text-sand/60 transition-colors group-hover:text-sand/90">
                            Voglio rimanere anonimo {formName && <span className="opacity-60">({getAnonymizedName(formName)})</span>}
                          </span>
                        </label>

                        <div>
                          <label className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.18em] text-sand/50">
                            Foto (opzionale)
                          </label>
                          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/15 bg-white/5 px-4 py-3 transition-colors hover:border-white/30 hover:bg-white/10">
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const result = ev.target?.result as string;
                                  setPhotoBase64(result);
                                  setPhotoPreview(result);
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                            {photoPreview ? (
                              <img src={photoPreview} alt="preview" className="h-10 w-10 rounded-full object-cover border border-ocean/40" />
                            ) : (
                              <svg className="h-5 w-5 text-sand/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                              </svg>
                            )}
                            <span className="font-body text-xs text-sand/50">
                              {photoPreview ? "Cambia foto" : "Carica foto"}
                            </span>
                            {photoPreview && (
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setPhotoBase64(""); setPhotoPreview(""); }}
                                className="ml-auto font-body text-xs text-sand/30 hover:text-sand/60"
                              >
                                ✕
                              </button>
                            )}
                          </label>
                        </div>

                        <div>
                          <label className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.18em] text-sand/50">
                            {t("testimonials.write.rating") || "Voto"}
                          </label>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => {
                              const v = i + 1;
                              return (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setFormRating(v)}
                                  aria-label={`${v} / 5`}
                                  className="p-1 transition-transform hover:scale-110"
                                >
                                  <svg className={`h-7 w-7 ${v <= formRating ? "text-amber-400" : "text-white/15"}`} viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10 1l2.39 4.84L17.5 6.9l-3.75 3.66.89 5.17L10 13.38l-4.64 2.35.89-5.17L2.5 6.9l5.11-1.06L10 1z" />
                                  </svg>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block font-body text-[11px] uppercase tracking-[0.18em] text-sand/50">
                            {t("contact.message") || "Commento"}
                          </label>
                          <textarea
                            required
                            rows={4}
                            value={formText}
                            onChange={(e) => setFormText(e.target.value)}
                            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-body text-sm text-sand placeholder:text-sand/30 focus:border-ocean/60 focus:bg-white/10 focus:outline-none"
                            placeholder="Co najbardziej zapadło Wam w pamięć?"
                          />
                        </div>

                        <input
                          type="text"
                          name="website"
                          value={honeypot}
                          onChange={(e) => setHoneypot(e.target.value)}
                          tabIndex={-1}
                          aria-hidden="true"
                          style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
                        />
                        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                          <Turnstile
                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                            onSuccess={setTurnstileToken}
                            options={{ theme: "dark", size: "normal" }}
                            className="mt-1"
                          />
                        )}
                        <button
                          type="submit"
                          disabled={formStatus === "sending" || formStatus === "sent"}
                          className="mt-5 flex w-full items-center justify-center rounded-full bg-ocean px-6 py-3.5 font-body text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_8px_20px_-6px_rgba(59,130,196,0.5)] transition-all duration-300 hover:bg-ocean/90 hover:scale-[1.02] disabled:hover:scale-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {formStatus === "sending"
                            ? t("testimonials.write.sending") || "Invio..."
                            : formStatus === "sent"
                            ? t("testimonials.write.sent") || "Inviato!"
                            : formStatus === "error"
                            ? t("testimonials.write.error") || "Errore"
                            : t("testimonials.write.submit") || "Invia Recensione"}
                        </button>
                      </motion.form>
                    ) : (
                      <motion.div
                        key="google"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col items-center justify-center pt-2 pb-4 text-center"
                      >
                        <div className="mb-6 inline-flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                          <svg className="h-[34px] w-[34px]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        </div>
                        <h4 className="mb-2 font-heading text-xl text-sand sm:text-2xl">
                          Condividi la tua esperienza
                        </h4>
                        <p className="mb-8 max-w-xs font-body text-[13px] leading-relaxed text-sand/70">
                          Lascia la tua recensione direttamente su Google e aiutaci a crescere! Il tuo feedback è fondamentale per noi.
                        </p>
                        <a
                          href="https://g.page/r/CUKVPm5VC_ClEBM/review"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center gap-3 rounded-full bg-blue-600 px-6 py-3.5 font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] transition-all hover:bg-blue-700 hover:scale-[1.02] hover:shadow-[0_12px_24px_-8px_rgba(37,99,235,0.6)]"
                        >
                          Continua con Google
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
}
