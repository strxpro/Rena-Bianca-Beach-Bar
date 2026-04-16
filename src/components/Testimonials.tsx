"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { createPortal } from "react-dom";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
} from "framer-motion";

/* ── Drag-to-scroll helper — turns any overflow-x-auto element into
      a click-and-drag scroller on mouse, with velocity-based inertia
      so finger swipes on mobile glide to a rest instead of stopping
      abruptly. Touch scrolling also goes through this path (not the
      browser default) so the movement stays smooth and we can add
      a post-release momentum tween.
   ── */
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    rafId: 0,
  });

  /* ── Stops any currently running momentum animation. Called on
         every fresh pointerdown so a new drag doesn't fight the
         tail-end of the previous glide. ── */
  const stopMomentum = () => {
    if (state.current.rafId) {
      cancelAnimationFrame(state.current.rafId);
      state.current.rafId = 0;
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stopMomentum();
    state.current.isDown = true;
    state.current.moved = false;
    state.current.startX = e.clientX;
    state.current.lastX = e.clientX;
    state.current.lastTime = performance.now();
    state.current.velocity = 0;
    state.current.scrollLeft = el.scrollLeft;
    try { el.setPointerCapture(e.pointerId); } catch {}
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !state.current.isDown) return;
    const now = performance.now();
    const dx = e.clientX - state.current.startX;
    if (Math.abs(dx) > 4) state.current.moved = true;
    el.scrollLeft = state.current.scrollLeft - dx;

    /* Track instantaneous velocity so we can seed the momentum
       tween with a realistic starting speed on pointerup. */
    const dt = Math.max(8, now - state.current.lastTime);
    state.current.velocity = (e.clientX - state.current.lastX) / dt;
    state.current.lastX = e.clientX;
    state.current.lastTime = now;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    state.current.isDown = false;
    try { el.releasePointerCapture(e.pointerId); } catch {}

    /* ── Momentum tween: decays the remembered velocity each
           frame and applies it to scrollLeft — the row glides to
           a stop instead of snapping still the moment the user
           lifts their finger. ── */
    let v = state.current.velocity * 16; // px per frame at ~60fps
    if (Math.abs(v) < 0.5) return;
    const tick = () => {
      const inner = ref.current;
      if (!inner) return;
      inner.scrollLeft -= v;
      v *= 0.94; // friction — exponential decay
      if (Math.abs(v) > 0.3) {
        state.current.rafId = requestAnimationFrame(tick);
      } else {
        state.current.rafId = 0;
      }
    };
    state.current.rafId = requestAnimationFrame(tick);
  };

  /* Prevent click-through on cards when the user was actually
     dragging across them. */
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state.current.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return { ref, onPointerDown, onPointerMove, onPointerUp, onClickCapture };
}

/* ═══════════════════════════════════════════════════════════════
   TESTIMONIALS — Parallax review grid + popup + masonry overlay
   Inspired by hero-parallax layout, adapted for guest reviews.
   ═══════════════════════════════════════════════════════════════ */

const REVIEWS = [
  {
    name: "Marta K.",
    role: "Stały gość",
    date: "2026-03-12",
    text: "Rena Bianca to nasze ulubione miejsce na wakacjach. Koktajle są niesamowite, a atmosfera przenosi nad Morze Śródziemne. Wracamy co roku!",
    rating: 5,
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Tomasz W.",
    role: "Krytyk kulinarny",
    date: "2026-02-28",
    text: "Pasta z owocami morza to arcydzieło. Świeże składniki, perfekcyjna tekstura i smaki, które eksplodują na podniebieniu. Gorąco polecam!",
    rating: 5,
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Anna i Piotr",
    role: "Para na rocznicę",
    date: "2026-04-01",
    text: "Spędziliśmy tu rocznicę ślubu i było magicznie. Zachód słońca, doskonałe wino i ciepła obsługa. Niezapomniane wspomnienie.",
    rating: 5,
    photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Julia S.",
    role: "Influencerka",
    date: "2026-01-15",
    text: "Każdy kąt jest instagramowy! Ale to jedzenie jest prawdziwą gwiazdą. Tiramisu z limonką to coś, co śni mi się po nocach.",
    rating: 4,
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Marcin D.",
    role: "Foodie",
    date: "2025-12-20",
    text: "Najlepsze risotto jakie jadłem w Polsce. Szef kuchni naprawdę rozumie włoską kuchnię. Selekcja win również na najwyższym poziomie.",
    rating: 5,
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Katarzyna L.",
    role: "Rodzinny obiad",
    date: "2026-03-25",
    text: "Przyszliśmy z całą rodziną i wszyscy byli zachwyceni. Menu dla dzieci jest świetne, a deser z mascarpone — boski!",
    rating: 4,
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Łukasz P.",
    role: "Biznes lunch",
    date: "2026-02-10",
    text: "Idealne miejsce na spotkanie biznesowe. Dyskretna atmosfera, doskonała obsługa i kuchnia, która robi wrażenie na każdym kliencie.",
    rating: 5,
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Ewa M.",
    role: "Wegetarianka",
    date: "2026-04-10",
    text: "Wreszcie restauracja, gdzie wegetariańskie dania nie są nudne! Grillowane warzywa z burratą — perfekcja. Obsługa zawsze pomocna.",
    rating: 4,
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Robert K.",
    role: "Sommelier",
    date: "2025-11-05",
    text: "Karta win jest fantastyczna — wybór sardyńskich i sycylijskich pozycji robi wrażenie. Personel doradza z pasją i wiedzą.",
    rating: 5,
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Natalia B.",
    role: "Urodziny",
    date: "2026-01-28",
    text: "Świętowaliśmy tu moje 30-ste urodziny. Tort na zamówienie, personalizowane menu i magiczny klimat. Marzenie!",
    rating: 5,
    photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Adam Z.",
    role: "Turysta",
    date: "2026-03-05",
    text: "Znaleźliśmy to miejsce przypadkiem i to był najlepszy przypadek podróży. Widoki, jedzenie i obsługa — 10/10.",
    rating: 4,
    photo: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Izabela W.",
    role: "Food blogger",
    date: "2026-04-05",
    text: "Blog eksplodował po poście o tym miejscu! Zdjęcia robią się same, a smaki mówią za siebie. Muszę wrócić po więcej.",
    rating: 5,
    photo: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Michał S.",
    role: "Romantyczna kolacja",
    date: "2025-12-31",
    text: "Zaprosiłem dziewczynę na kolację i powiedziała tak! Atmosfera tego miejsca jest po prostu magiczna.",
    rating: 5,
    photo: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Olga T.",
    role: "Rodzina",
    date: "2026-02-14",
    text: "Dzieci uwielbiają tutejszą pizzę, a my z mężem cieszymy się spokojnym wieczorem z lampką prosecco. Perfekcyjne miejsce dla rodzin.",
    rating: 5,
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&q=80",
  },
  {
    name: "Paweł N.",
    role: "Weekend trip",
    date: "2026-03-18",
    text: "Sardyński klimat w środku Polski? Tak! Rena Bianca przenosi cię nad morze jednym kęsem. Genialny koncept i wykonanie.",
    rating: 5,
    photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&q=80",
  },
];

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

/* ── Single review "sticker" card (polaroid / post-it style) ── */
function ReviewCard({
  review,
  onClick,
  tilt = 0,
  tapeColor = "rgba(253,251,247,0.55)",
}: {
  review: (typeof REVIEWS)[0];
  onClick: () => void;
  tilt?: number;
  tapeColor?: string;
}) {
  return (
    <motion.div
      style={{ rotate: tilt }}
      whileHover={{ y: -10, rotate: 0, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group/review relative h-60 w-72 shrink-0 cursor-pointer sm:h-72 sm:w-88"
      onClick={onClick}
    >
      {/* ── Polaroid frame ── */}
      <div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-[6px] bg-[#FDFBF7] p-2.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55),0_4px_10px_rgba(0,0,0,0.25)] transition-shadow duration-300 group-hover/review:shadow-[0_26px_60px_-12px_rgba(0,0,0,0.7),0_6px_14px_rgba(0,0,0,0.35)] sm:p-3"
      >
        {/* ── Tape strip across the top — that "sticker stuck onto a wall" feel ── */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-2 left-1/2 z-10 h-5 w-20 -translate-x-1/2 -rotate-2 shadow-md sm:w-24"
          style={{
            background: `linear-gradient(180deg, ${tapeColor} 0%, rgba(253,251,247,0.25) 100%)`,
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
        />

        {/* Photo */}
        <div className="relative h-[58%] w-full overflow-hidden rounded-[3px] bg-navy/5">
          <img
            src={review.photo}
            alt={review.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover/review:scale-[1.04]"
            draggable={false}
            loading="lazy"
          />
          {/* subtle warm photo tint */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_60%)]" />
        </div>

        {/* Handwritten caption */}
        <div className="flex flex-1 flex-col justify-between px-1 pb-1 pt-2 sm:px-1.5 sm:pt-2.5">
          <div>
            <Stars count={review.rating} />
            <p className="mt-1 line-clamp-2 font-body text-[12px] leading-snug text-navy/80 sm:text-[13px]">
              &ldquo;{review.text}&rdquo;
            </p>
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="min-w-0 truncate font-heading text-[13px] text-navy sm:text-sm" style={{ fontWeight: 500 }}>
              — {review.name}
            </p>
            <span className="font-body text-[9px] tabular-nums text-navy/30">
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

export default function Testimonials() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [selectedReview, setSelectedReview] = useState<(typeof REVIEWS)[0] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showWrite, setShowWrite] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [mounted, setMounted] = useState(false);

  /* Write-form state. We collect locally then bounce to a transport
     of the owner's choice (mailto fallback by default — see the
     Make.com / Sheets recipe in the chat reply). */
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => { setMounted(true); }, []);

  const submitReview = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formText.trim()) return;
    setFormStatus("sending");
    try {
      /* Webhook URL is read from NEXT_PUBLIC_REVIEW_WEBHOOK at build
         time. Drop your Make.com / Zapier / Apps Script webhook
         there and the form posts straight to it — no DB needed. */
      const webhook = process.env.NEXT_PUBLIC_REVIEW_WEBHOOK;
      if (webhook) {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            rating: formRating,
            text: formText,
            source: "site",
            date: new Date().toISOString(),
          }),
        });
        if (!res.ok) throw new Error("webhook failed");
      } else {
        // No webhook configured → fall back to mailto so submissions
        // are never silently lost while the integration is wired up.
        const subject = encodeURIComponent(`Nowa opinia – ${formName}`);
        const body = encodeURIComponent(
          `Imię: ${formName}\nEmail: ${formEmail}\nOcena: ${formRating}/5\n\n${formText}`
        );
        window.location.href = `mailto:hello@renabianca.pl?subject=${subject}&body=${body}`;
      }
      setFormStatus("sent");
      setFormName("");
      setFormEmail("");
      setFormText("");
      setFormRating(5);
      window.setTimeout(() => {
        setShowWrite(false);
        setFormStatus("idle");
      }, 1600);
    } catch {
      setFormStatus("error");
    }
  }, [formName, formEmail, formRating, formText]);

  const firstRow = REVIEWS.slice(0, 5);
  const secondRow = REVIEWS.slice(5, 10);
  const thirdRow = REVIEWS.slice(10, 15);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const springConfig = { stiffness: 120, damping: 26, mass: 0.9 };

  /* Scroll-driven parallax — the wrapper rotates / drifts the
     whole way through the section's scroll range so the cards
     feel "sticky" to the page: they keep tilting and settling
     as the viewer scrolls, only flattening out across the middle
     and tipping the opposite way on exit (Aceternity hero-parallax
     idea, adapted for guest reviews). */
  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 0.35, 0.75, 1], [14, 0, 0, -10]),
    springConfig
  );
  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.12, 0.85, 1], [0.25, 1, 1, 0.35]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollYProgress, [0, 0.35, 0.75, 1], [16, 0, 0, -12]),
    springConfig
  );
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [-320, -40, 30, 160]),
    springConfig
  );

  /* Drag-scroll handlers — one per row so each row scrolls
     independently. Uses native overflow-x-auto + pointer events
     so touch works on mobile without any extra code. */
  const row1 = useDragScroll();
  const row2 = useDragScroll();
  const row3 = useDragScroll();

  const openReview = useCallback((r: (typeof REVIEWS)[0]) => setSelectedReview(r), []);
  const closeReview = useCallback(() => setSelectedReview(null), []);

  return (
    <>
      <div
        id="testimonials"
        ref={ref}
        className="relative flex flex-col self-auto overflow-x-hidden py-10 antialiased perspective-[1000px] transform-3d sm:py-20"
        style={{
          // `minHeight` (instead of fixed `height`) lets the section grow
          // tall enough to fit the CTA under the 3rd row on every screen —
          // it never cuts the "zobacz więcej / napisz" buttons off.
          minHeight: "150vh",
          background: "linear-gradient(180deg, #0A192F 0%, #0d2240 20%, #1a4a6e 55%, #5ba3d9 80%, #8ec5e8 100%)",
        }}
      >
        {/* ── Header ── */}
        <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 md:py-20">
          <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.25em] text-sand/50 sm:mb-3 sm:text-xs sm:tracking-[0.3em]">
            {t("testimonials.label")}
          </span>
          <h2 className="font-heading text-2xl text-sand sm:text-3xl md:text-7xl" style={{ fontWeight: 400 }}>
            {t("testimonials.heading")}
          </h2>
          <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-sand/60 sm:mt-6 sm:text-base md:text-xl">
            {t("testimonials.description")}
          </p>
        </div>

        {/* ── Draggable rows — restored Aceternity-style hero
              parallax. The rotateX / rotateZ / translateY / opacity
              transforms drive the entire stack of rows so the cards
              feel sticky and 3D as the viewer scrolls past. Each
              row independently scrolls horizontally on drag /
              swipe (overflow-x-auto + pointer-event handlers). ── */}
        <motion.div style={{ rotateX, rotateZ, translateY, opacity }}>
          {/* Row 1 */}
          <div
            ref={row1.ref}
            onPointerDown={row1.onPointerDown}
            onPointerMove={row1.onPointerMove}
            onPointerUp={row1.onPointerUp}
            onPointerCancel={row1.onPointerUp}
            onClickCapture={row1.onClickCapture}
            className="scrollbar-hide mb-4 flex cursor-grab flex-row-reverse space-x-6 space-x-reverse overflow-x-auto overscroll-x-contain px-6 py-2 active:cursor-grabbing sm:mb-8 sm:space-x-20 sm:space-x-reverse sm:px-10"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", touchAction: "pan-x pan-y", scrollBehavior: "auto" }}
          >
            {firstRow.map((r, i) => (
              <div key={r.name}>
                <ReviewCard
                  review={r}
                  onClick={() => openReview(r)}
                  tilt={STICKER_TILTS[i % STICKER_TILTS.length]}
                  tapeColor={TAPE_COLORS[i % TAPE_COLORS.length]}
                />
              </div>
            ))}
          </div>

          {/* Row 2 */}
          <div
            ref={row2.ref}
            onPointerDown={row2.onPointerDown}
            onPointerMove={row2.onPointerMove}
            onPointerUp={row2.onPointerUp}
            onPointerCancel={row2.onPointerUp}
            onClickCapture={row2.onClickCapture}
            className="scrollbar-hide mb-4 flex cursor-grab flex-row space-x-6 overflow-x-auto overscroll-x-contain px-6 py-2 active:cursor-grabbing sm:mb-8 sm:space-x-20 sm:px-10"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", touchAction: "pan-x pan-y", scrollBehavior: "auto" }}
          >
            {secondRow.map((r, i) => (
              <div key={r.name}>
                <ReviewCard
                  review={r}
                  onClick={() => openReview(r)}
                  tilt={STICKER_TILTS[(i + 2) % STICKER_TILTS.length]}
                  tapeColor={TAPE_COLORS[(i + 2) % TAPE_COLORS.length]}
                />
              </div>
            ))}
          </div>

          {/* Row 3 */}
          <div
            ref={row3.ref}
            onPointerDown={row3.onPointerDown}
            onPointerMove={row3.onPointerMove}
            onPointerUp={row3.onPointerUp}
            onPointerCancel={row3.onPointerUp}
            onClickCapture={row3.onClickCapture}
            className="scrollbar-hide mb-4 flex cursor-grab flex-row-reverse space-x-6 space-x-reverse overflow-x-auto overscroll-x-contain px-6 py-2 active:cursor-grabbing sm:mb-8 sm:space-x-20 sm:space-x-reverse sm:px-10"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", touchAction: "pan-x pan-y", scrollBehavior: "auto" }}
          >
            {thirdRow.map((r, i) => (
              <div key={r.name}>
                <ReviewCard
                  review={r}
                  onClick={() => openReview(r)}
                  tilt={STICKER_TILTS[(i + 4) % STICKER_TILTS.length]}
                  tapeColor={TAPE_COLORS[(i + 4) % TAPE_COLORS.length]}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── CTA — rendered OUTSIDE the parallax motion.div so it never
              inherits the end-of-scroll fade (opacity → 0.4) or the
              translateY push that was cutting it off. It sits right
              below the third row in normal document flow, always visible.

              Decoration is intentionally swapped vs. before:
                • "See all reviews" → bare text link with the same
                  hand-drawn underline highlight the header nav uses.
                • "Leave a review"  → the rounded-pill bordered card
                  that visually anchors the CTA stack. ── */}
        <div className="pointer-events-auto relative z-20 mx-auto mt-6 flex w-full max-w-2xl flex-col items-center gap-6 px-4 pb-12 sm:mt-10 sm:gap-7 sm:px-6 sm:pb-16 md:mt-14 md:gap-8 md:px-8 md:pb-24">
          {/* See-all — header-style link with hand-drawn underline */}
          <button
            onClick={() => setShowAll(true)}
            className="group/seeall relative inline-flex select-none items-center justify-center px-2 py-1.5 font-body text-sm font-medium uppercase tracking-[0.18em] text-sand transition-colors duration-300 hover:text-white sm:text-[15px] md:text-base"
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

          {/* Leave-a-review — bordered pill button that opens the
              write-a-review popup form. */}
          <button
            type="button"
            onClick={() => setShowWrite(true)}
            className="group/leave block w-full max-w-md rounded-full border border-sand/30 bg-sand/10 px-6 py-4 text-center backdrop-blur-sm transition-all duration-300 hover:border-sand/50 hover:bg-sand/20 sm:px-8 sm:py-5 md:px-10 md:py-6"
          >
            <h3
              className="font-heading text-lg text-sand sm:text-xl md:text-2xl"
              style={{ fontWeight: 400 }}
            >
              {t("testimonials.cta.heading")}
            </h3>
            <p className="mx-auto mt-1 max-w-xs font-body text-xs leading-relaxed text-sand/60 sm:mt-2 sm:max-w-sm sm:text-sm md:mt-2.5 md:max-w-md md:text-base">
              {t("testimonials.cta.description")}
            </p>
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
                    <img src={selectedReview.photo} alt="" className="h-full w-full object-cover" />
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
                      <img src={selectedReview.photo} alt="" className="h-16 w-16 rounded-full border-2 border-[#0d2240] object-cover shadow-lg" />
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
                onClick={() => setShowAll(false)}
              >
                {/* Close */}
                <button
                  onClick={() => setShowAll(false)}
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
                    {[...REVIEWS]
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
                <motion.form
                  initial={{ scale: 0.9, y: 30, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 30, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  onSubmit={submitReview}
                  className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d2240] p-6 shadow-2xl sm:p-8"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setShowWrite(false)}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60"
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
                    <p className="mx-auto mt-1.5 max-w-xs font-body text-xs leading-relaxed text-sand/55">
                      {t("testimonials.cta.description")}
                    </p>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="mb-1 block font-body text-[11px] uppercase tracking-[0.18em] text-sand/50">
                        {t("contact.name")}
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

                    <div>
                      <label className="mb-1 block font-body text-[11px] uppercase tracking-[0.18em] text-sand/50">
                        {t("contact.email")} <span className="text-sand/30 normal-case tracking-normal">({t("contact.optional")})</span>
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-body text-sm text-sand placeholder:text-sand/30 focus:border-ocean/60 focus:bg-white/10 focus:outline-none"
                        placeholder="jan@example.com"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.18em] text-sand/50">
                        {t("testimonials.sort.highest") || "Ocena"}
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
                        {t("contact.message")}
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
                  </div>

                  <button
                    type="submit"
                    disabled={formStatus === "sending" || formStatus === "sent"}
                    className="mt-5 w-full rounded-full bg-ocean px-6 py-3 font-body text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_-8px_rgba(59,130,196,0.7)] transition-all duration-300 hover:bg-ocean/90 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-6"
                  >
                    {formStatus === "sending"
                      ? "Wysyłanie…"
                      : formStatus === "sent"
                      ? "Dziękujemy!"
                      : formStatus === "error"
                      ? "Spróbuj ponownie"
                      : t("testimonials.cta.button") || "Wyślij opinię"}
                  </button>

                  <p className="mt-3 text-center font-body text-[10px] leading-relaxed text-sand/35">
                    Po publikacji opinia pojawi się obok komentarzy z Google.
                  </p>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
}
