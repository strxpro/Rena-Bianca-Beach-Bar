"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { createPortal } from "react-dom";
import { Turnstile } from "@marsidev/react-turnstile";
import { createAvatar } from "@dicebear/core";
import { funEmoji } from "@dicebear/collection";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  motion,
  AnimatePresence,
  animate,
  useDragControls,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import type { PanInfo } from "framer-motion";
import { getMobilePerformanceProfile } from "@/lib/mobile-performance";

gsap.registerPlugin(useGSAP, ScrollTrigger);

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
  photos?: string[];
  isLocal?: boolean;
  countryCode?: string;
  countryName?: string;
};

const REVIEWS_BATCH_SIZE = 10;
const CAROUSEL_MAX_PER_ROW = 10;
const CAROUSEL_SOURCE_LIMIT = 40;
const CAROUSEL_LOOP_COPIES = 3;
const AUTO_OPEN_SHOW_ALL_AFTER_ROW_LOADS = 3;
const DEFAULT_SHOW_ALL_SORT = "highest" as const;
const DRAG_SPIN_MAGNET_STOPS = [-18, -12, -8, -4, 0, 4, 8, 12, 18];
const CARD_DRAG_LONG_PRESS_MS = 280;
const CARD_DRAG_CANCEL_DISTANCE = 16;
const ROW_DRAG_SCROLL_THRESHOLD = 6;
const PHOTO_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;

const TESTIMONIALS_UI_COPY = {
  pl: {
    rowLatest: "Najnowsze",
    rowTopRated: "Najlepiej oceniane",
    rowPopular: "Najpopularniejsze",
    close: "Zamknij",
    tabLocal: "Opinia lokalna",
    tabGoogle: "Opinia w Google",
    avatarPreviewAlt: "Podgląd awatara",
    anonymous: "Chcę pozostać anonimowy",
    photosMeta: "Zdjęcia, maks. 3, opcjonalnie",
    photoTooLarge: "Maksymalny rozmiar zdjęcia to 10 MB.",
    removePhoto: "Usuń zdjęcie",
    googleHeading: "Podziel się swoją opinią",
    googleDescription: "Zostaw opinię bezpośrednio w Google i pomóż nam się rozwijać. Twój feedback jest dla nas bardzo ważny.",
    googleButton: "Przejdź do Google",
    thankYouTitle: "Dziękujemy!",
    thankYouMessage: "Twoja opinia została przesłana. Bardzo ją cenimy!",
  },
  it: {
    rowLatest: "Più recenti",
    rowTopRated: "Più apprezzate",
    rowPopular: "Più popolari",
    close: "Chiudi",
    tabLocal: "Recensione locale",
    tabGoogle: "Recensione su Google",
    avatarPreviewAlt: "Anteprima avatar",
    anonymous: "Voglio rimanere anonimo",
    photosMeta: "Foto, massimo 3, facoltative",
    photoTooLarge: "La dimensione massima per foto è 10 MB.",
    removePhoto: "Rimuovi foto",
    googleHeading: "Condividi la tua esperienza",
    googleDescription: "Lascia la tua recensione direttamente su Google e aiutaci a crescere. Il tuo feedback è fondamentale per noi.",
    googleButton: "Continua con Google",
    thankYouTitle: "Grazie!",
    thankYouMessage: "La tua recensione è stata inviata. La apprezziamo molto!",
  },
  es: {
    rowLatest: "Más recientes",
    rowTopRated: "Mejor valoradas",
    rowPopular: "Más populares",
    close: "Cerrar",
    tabLocal: "Reseña local",
    tabGoogle: "Reseña en Google",
    avatarPreviewAlt: "Vista previa del avatar",
    anonymous: "Quiero permanecer en el anonimato",
    photosMeta: "Fotos, máximo 3, opcionales",
    photoTooLarge: "El tamaño máximo por foto es de 10 MB.",
    removePhoto: "Eliminar foto",
    googleHeading: "Comparte tu experiencia",
    googleDescription: "Deja tu reseña directamente en Google y ayúdanos a crecer. Tu opinión es muy importante para nosotros.",
    googleButton: "Continuar con Google",
    thankYouTitle: "¡Gracias!",
    thankYouMessage: "Tu reseña ha sido enviada. ¡La valoramos mucho!",
  },
  fr: {
    rowLatest: "Plus récents",
    rowTopRated: "Mieux notés",
    rowPopular: "Les plus populaires",
    close: "Fermer",
    tabLocal: "Avis local",
    tabGoogle: "Avis Google",
    avatarPreviewAlt: "Aperçu de l'avatar",
    anonymous: "Je souhaite rester anonyme",
    photosMeta: "Photos, maximum 3, facultatives",
    photoTooLarge: "La taille maximale par photo est de 10 Mo.",
    removePhoto: "Supprimer la photo",
    googleHeading: "Partagez votre expérience",
    googleDescription: "Laissez votre avis directement sur Google et aidez-nous à grandir. Votre retour est essentiel pour nous.",
    googleButton: "Continuer avec Google",
    thankYouTitle: "Merci !",
    thankYouMessage: "Votre avis a été envoyé. Nous l'apprécions beaucoup !",
  },
  de: {
    rowLatest: "Neueste",
    rowTopRated: "Am besten bewertet",
    rowPopular: "Beliebteste",
    close: "Schließen",
    tabLocal: "Lokale Bewertung",
    tabGoogle: "Google-Bewertung",
    avatarPreviewAlt: "Avatar-Vorschau",
    anonymous: "Ich möchte anonym bleiben",
    photosMeta: "Fotos, maximal 3, optional",
    photoTooLarge: "Die maximale Bildgröße beträgt 10 MB.",
    removePhoto: "Foto entfernen",
    googleHeading: "Teilen Sie Ihre Erfahrung",
    googleDescription: "Hinterlassen Sie Ihre Bewertung direkt bei Google und helfen Sie uns zu wachsen. Ihr Feedback ist uns sehr wichtig.",
    googleButton: "Weiter zu Google",
    thankYouTitle: "Vielen Dank!",
    thankYouMessage: "Ihre Bewertung wurde gesendet. Wir schätzen sie sehr!",
  },
  en: {
    rowLatest: "Latest",
    rowTopRated: "Top rated",
    rowPopular: "Most popular",
    close: "Close",
    tabLocal: "Local review",
    tabGoogle: "Google review",
    avatarPreviewAlt: "Avatar preview",
    anonymous: "I want to stay anonymous",
    photosMeta: "Photos, up to 3, optional",
    photoTooLarge: "Maximum photo size is 10 MB.",
    removePhoto: "Remove photo",
    googleHeading: "Share your experience",
    googleDescription: "Leave your review directly on Google and help us grow. Your feedback matters a lot to us.",
    googleButton: "Continue with Google",
    thankYouTitle: "Thank you!",
    thankYouMessage: "Your review has been submitted. We really appreciate it!",
  },
} as const;

function createRandomAvatarSeed() {
  return Math.random().toString(36).slice(2, 10);
}

function getGeneratedAvatarUrl(seed: string) {
  const source = (seed || "Rena Bianca").trim() || "Rena Bianca";
  const svg = createAvatar(funEmoji, {
    seed: source,
    size: 160,
  }).toString();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function extractReviewImageUrl(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^data:image\//i.test(trimmed)) return trimmed;

    const decoded = trimmed
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;|&#39;/gi, "'")
      .replace(/^['\"]+|['\"]+$/g, "")
      .replace(/\\\//g, "/")
      .replace(/\\"/g, '"')
      .trim();

    const imageFormulaMatch = decoded.match(/=image\(\s*["']([^"']+)["']/i);
    if (imageFormulaMatch?.[1]) {
      return imageFormulaMatch[1].trim();
    }

    const hyperlinkMatch = decoded.match(/=hyperlink\(\s*["']([^"']+)["']/i);
    if (hyperlinkMatch?.[1]) {
      return hyperlinkMatch[1].trim();
    }

    const urlMatch = decoded.match(/https?:\/\/[^\s"'()<>]+/i);
    if (urlMatch?.[0]) {
      return urlMatch[0];
    }

    if (decoded.startsWith("//")) {
      return `https:${decoded}`;
    }

    if (/^(?:www\.)?[\w.-]+\.[a-z]{2,}(?:\/[^\s"'()<>]*)?$/i.test(decoded)) {
      return `https://${decoded.replace(/^https?:\/\//i, "")}`;
    }

    if (decoded.startsWith("/") || decoded.startsWith("./") || decoded.startsWith("../")) {
      return decoded;
    }

    if (
      (decoded.startsWith("{") && decoded.endsWith("}")) ||
      (decoded.startsWith("[") && decoded.endsWith("]"))
    ) {
      try {
        return extractReviewImageUrl(JSON.parse(decoded));
      } catch {
        return "";
      }
    }

    return "";
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = extractReviewImageUrl(entry);
      if (nested) return nested;
    }
    return "";
  }

  if (value && typeof value === "object") {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      const nested = extractReviewImageUrl(entry);
      if (nested) return nested;
    }
  }

  return "";
}

function normalizeReviewImageUrl(value: string) {
  return extractReviewImageUrl(value);
}

function getReviewAvatarFallback(review: Pick<Review, "name" | "date" | "text">) {
  return getGeneratedAvatarUrl(`${review.name}|${review.date}|${review.text.slice(0, 48)}`);
}

type LoopedReviewItem = {
  review: Review;
  copyIndex: number;
  baseIndex: number;
};

type RowId = 1 | 2 | 3;

type RowDragState = {
  active: boolean;
  pointerId: number | null;
  startX: number;
  startScrollLeft: number;
  moved: boolean;
};

function createIdleRowDragState(): RowDragState {
  return {
    active: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  };
}

function createLoopedItems(items: Review[]): LoopedReviewItem[] {
  if (!items.length) {
    return [];
  }

  return Array.from({ length: CAROUSEL_LOOP_COPIES }, (_, copyIndex) => (
    items.map((review, baseIndex) => ({ review, copyIndex, baseIndex }))
  )).flat();
}

function getNearestMagneticTilt(value: number) {
  return DRAG_SPIN_MAGNET_STOPS.reduce((nearest, stop) => (
    Math.abs(stop - value) < Math.abs(nearest - value) ? stop : nearest
  ), DRAG_SPIN_MAGNET_STOPS[0]);
}

function getDateValue(date: string) {
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseReviewText(text: string) {
  const normalized = (text || "").trim();
  if (!normalized) {
    return { displayText: "", sourceText: "", originalText: "" };
  }

  const translatedMatch = normalized.match(/\(Translated by Google\)\s*([\s\S]*?)(?:\(Original\)|$)/i);
  const originalMatch = normalized.match(/\(Original\)\s*([\s\S]*)$/i);

  if (translatedMatch) {
    const translatedText = translatedMatch[1].trim();
    const originalText = (originalMatch?.[1] || "").trim();
    return {
      displayText: translatedText,
      sourceText: originalText || translatedText,
      originalText,
    };
  }

  const cleaned = normalized.replace(/\(Translated by Google\)/gi, "").trim();
  return {
    displayText: cleaned,
    sourceText: cleaned,
    originalText: "",
  };
}

function getReviewId(review: Review) {
  return `${review.name}__${review.date}__${review.text.slice(0, 80)}`;
}

function getCountryFlagEmoji(code?: string) {
  if (!code || !/^[A-Z]{2}$/i.test(code)) return "";
  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function getCountryLabel(review: Review, locale: string) {
  if (review.countryName) return review.countryName;
  if (!review.countryCode) return "";
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    return displayNames.of(review.countryCode) || review.countryCode;
  } catch {
    return review.countryCode;
  }
}

function SafeReviewImage({
  review,
  className,
  alt,
}: {
  review: Review;
  className: string;
  alt: string;
}) {
  const fallbackSrc = getReviewAvatarFallback(review);
  const primarySrc = normalizeReviewImageUrl(review.photo);
  const [src, setSrc] = useState(primarySrc || fallbackSrc);

  useEffect(() => {
    setSrc(primarySrc || fallbackSrc);
  }, [primarySrc, fallbackSrc]);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={false}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== fallbackSrc) {
          setSrc(fallbackSrc);
        }
      }}
    />
  );
}

function ReviewOrigin({
  review,
  locale,
  className = "",
}: {
  review: Review;
  locale: string;
  className?: string;
}) {
  const flag = getCountryFlagEmoji(review.countryCode);
  const label = getCountryLabel(review, locale);

  if (!flag && !label) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-body text-[10px] text-white/70 backdrop-blur-sm ${className}`}>
      {flag && <span aria-hidden>{flag}</span>}
      {label && <span>{label}</span>}
    </span>
  );
}

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

function InlineLoadingDots() {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <span className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:-0.2s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:-0.1s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-white/60" />
    </div>
  );
}

function RowLoadingDots() {
  return (
    <div className="flex items-center justify-center py-2">
      <div className="rounded-full border border-white/10 bg-white/5 px-4 backdrop-blur-sm">
        <InlineLoadingDots />
      </div>
    </div>
  );
}

function ReviewCard({
  review,
  onClick,
  tilt = 0,
  tapeColor = "rgba(253,251,247,0.55)",
  lightMode = false,
}: {
  review: Review;
  onClick: () => void;
  tilt?: number;
  tapeColor?: string;
  /** Mniej animacji (starsze telefony / prefers-reduced-motion). */
  lightMode?: boolean;
}) {
  const { locale, t } = useI18n();
  const parsedText = parseReviewText(review.text);
  const imgHover = lightMode ? "" : "transition-transform duration-500 group-hover/review:scale-[1.04]";
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const dragRotate = useMotionValue(tilt);
  const dragControls = useDragControls();
  const [touchDragMode, setTouchDragMode] = useState(false);
  const suppressClickRef = useRef(false);
  const dragMovedRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressEventRef = useRef<PointerEvent | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDragArmedRef = useRef(false);

  useEffect(() => {
    dragRotate.set(tilt);
  }, [dragRotate, tilt]);

  const clearLongPressIntent = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressEventRef.current = null;
    pointerStartRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragMovedRef.current = false;
    touchDragArmedRef.current = false;
    setTouchDragMode(false);

    clearLongPressIntent();
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    longPressEventRef.current = e.nativeEvent;
    longPressTimerRef.current = window.setTimeout(() => {
      if (!longPressEventRef.current) return;
      touchDragArmedRef.current = true;
      suppressClickRef.current = true;
      setTouchDragMode(true);
      window.requestAnimationFrame(() => {
        if (!longPressEventRef.current) return;
        dragControls.start(longPressEventRef.current, { snapToCursor: false });
      });
    }, CARD_DRAG_LONG_PRESS_MS);
  }, [clearLongPressIntent, dragControls]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (touchDragArmedRef.current || !pointerStartRef.current) return;

    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;
    const delta = Math.hypot(deltaX, deltaY);
    const threshold = e.pointerType === "mouse" ? ROW_DRAG_SCROLL_THRESHOLD : CARD_DRAG_CANCEL_DISTANCE;
    if (delta > threshold) {
      clearLongPressIntent();
      setTouchDragMode(false);
    }
  }, [clearLongPressIntent]);

  const handlePointerRelease = useCallback(() => {
    clearLongPressIntent();
    if (touchDragArmedRef.current && !dragMovedRef.current) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 160);
    }
    touchDragArmedRef.current = false;
    setTouchDragMode(false);
  }, [clearLongPressIntent]);

  const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) + Math.abs(info.offset.y) > 10) {
      dragMovedRef.current = true;
    }
    dragRotate.set(tilt + info.offset.x * 0.06 + info.offset.y * 0.03);
  }, [dragRotate, tilt]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const speed = Math.hypot(info.velocity.x, info.velocity.y);
    const spinTarget = tilt + gsap.utils.clamp(-28, 28, info.velocity.x * 0.018 + info.velocity.y * 0.008);
    const magneticStop = getNearestMagneticTilt(spinTarget);

    suppressClickRef.current = dragMovedRef.current;
    dragMovedRef.current = false;

    void animate(dragX, 0, {
      type: "spring",
      stiffness: lightMode ? 640 : 280,
      damping: lightMode ? 42 : 20,
      mass: 0.82,
    });
    void animate(dragY, 0, {
      type: "spring",
      stiffness: lightMode ? 620 : 260,
      damping: lightMode ? 40 : 18,
      mass: 0.88,
    });

    if (!lightMode && speed > 900) {
      void animate(dragRotate, spinTarget, {
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1],
      });
      window.setTimeout(() => {
        void animate(dragRotate, magneticStop, {
          type: "spring",
          stiffness: 170,
          damping: 16,
          mass: 1.05,
        });
      }, 120);
    } else {
      void animate(dragRotate, magneticStop, {
        type: "spring",
        stiffness: lightMode ? 520 : 190,
        damping: lightMode ? 36 : 17,
        mass: 0.94,
      });
    }

    if (suppressClickRef.current) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 140);
    }
    setTouchDragMode(false);
  }, [dragRotate, dragX, dragY, lightMode, tilt]);

  const handleClick = useCallback(() => {
    if (suppressClickRef.current) return;
    onClick();
  }, [onClick]);

  return (
    <motion.div
      data-review-card
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={lightMode ? 0.1 : 0.22}
      dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
      onPointerLeave={handlePointerRelease}
      style={{ x: dragX, y: dragY, rotate: dragRotate, contain: "layout style", touchAction: touchDragMode ? "none" : "manipulation" }}
      whileHover={lightMode ? undefined : { y: -10, rotate: 0, scale: 1.02 }}
      whileTap={lightMode ? undefined : { scale: 1.01 }}
      transition={{ type: "spring", stiffness: lightMode ? 800 : 260, damping: lightMode ? 48 : 22 }}
      className="group/review relative h-[360px] w-[260px] shrink-0 cursor-grab select-none sm:h-[440px] sm:w-[320px] active:cursor-grabbing"
      onClick={handleClick}
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
            ...(lightMode ? {} : { backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }),
          }}
        />

        {/* Photo */}
        <div className="relative h-[42%] w-full overflow-hidden rounded-[4px] bg-navy/5 sm:h-[44%]">
          <SafeReviewImage
            review={review}
            alt={review.name}
            className={`h-full w-full object-cover ${imgHover}`}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_60%)]" />
        </div>
        <div className="relative flex flex-1 flex-col justify-between px-1 pb-1 pt-3 sm:px-2 sm:pt-4">
          <div>
            <Stars count={review.rating} />
            <p className="mt-2 line-clamp-5 font-body text-[12.5px] leading-snug text-navy/80 sm:line-clamp-7 sm:text-[13.5px]">
              &ldquo;{parsedText.displayText}&rdquo;
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {review.isLocal && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-50/80 px-2 py-0.5 shadow-[inset_0_0_8px_rgba(251,191,36,0.3)]">
                  <svg className="h-3 w-3 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-body text-[9px] font-semibold uppercase tracking-wider text-amber-700/90">{t("testimonials.badge.verified")}</span>
                </div>
              )}
              <ReviewOrigin review={review} locale={locale} className="border-navy/10 bg-navy/5 text-navy/60" />
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

export default function TestimonialsClient({ initialReviews = [] }: { initialReviews?: Review[] }) {
  const { t, locale } = useI18n();
  const uiCopy = TESTIMONIALS_UI_COPY[locale] ?? TESTIMONIALS_UI_COPY.en;
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const row1WrapRef = useRef<HTMLDivElement>(null);
  const row2WrapRef = useRef<HTMLDivElement>(null);
  const row3WrapRef = useRef<HTMLDivElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const row3Ref = useRef<HTMLDivElement>(null);
  const showAllScrollRef = useRef<HTMLDivElement>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showWrite, setShowWrite] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">(DEFAULT_SHOW_ALL_SORT);
  const [mounted, setMounted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(REVIEWS_BATCH_SIZE);
  const [popupLoading, setPopupLoading] = useState(false);
  const [translatedReviews, setTranslatedReviews] = useState<Record<string, string>>({});
  const [showOriginalMap, setShowOriginalMap] = useState<Record<string, boolean>>({});
  const [translationErrors, setTranslationErrors] = useState<Record<string, string>>({});
  const [translatingReviewId, setTranslatingReviewId] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [row1VisibleCount, setRow1VisibleCount] = useState(CAROUSEL_MAX_PER_ROW);
  const [row2VisibleCount, setRow2VisibleCount] = useState(CAROUSEL_MAX_PER_ROW);
  const [row3VisibleCount, setRow3VisibleCount] = useState(CAROUSEL_MAX_PER_ROW);
  const [row1Loading, setRow1Loading] = useState(false);
  const [row2Loading, setRow2Loading] = useState(false);
  const [row3Loading, setRow3Loading] = useState(false);
  const [rowLoadCycles, setRowLoadCycles] = useState(0);
  const reducedMotion = useReducedMotion();
  const autoOpenedShowAllFromRowsRef = useRef(false);
  const rowDragStateRef = useRef<Record<RowId, RowDragState>>({
    1: createIdleRowDragState(),
    2: createIdleRowDragState(),
    3: createIdleRowDragState(),
  });
  const [turnstileToken, setTurnstileToken] = useState("");
  const [writeModalSession, setWriteModalSession] = useState(0);
  const [honeypot, setHoneypot] = useState("");
  const [photos, setPhotos] = useState<{ base64: string; preview: string }[]>([]);
  const [formAvatarSeed, setFormAvatarSeed] = useState(() => createRandomAvatarSeed());
  const formOpenTimeRef = useRef<number>(Date.now());
  const [shouldRenderTurnstile, setShouldRenderTurnstile] = useState(false);
  const [activeTab, setActiveTab] = useState<"local" | "google">("local");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formText, setFormText] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const getAnonymizedName = (name: string) => {
    if (!name.trim()) return "";
    return name
      .trim()
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + ".")
      .join(" ");
  };

  const getAvatarUrl = useCallback((name: string, seedSuffix = formAvatarSeed) => {
    const normalizedName = (name || "Rena Bianca").trim() || "Rena Bianca";
    return getGeneratedAvatarUrl(`${normalizedName}|${seedSuffix}`);
  }, [formAvatarSeed]);

  const allReviews = React.useMemo(() => {
    const merged = [...localReviews, ...initialReviews].map((review) => ({
      ...review,
      text: (review.text || "").trim(),
      photo: normalizeReviewImageUrl(review.photo),
    }));

    const unique = new Map<string, Review>();
    merged.forEach((review) => {
      unique.set(getReviewId(review), review);
    });

    return Array.from(unique.values()).sort((a, b) => getDateValue(b.date) - getDateValue(a.date));
  }, [initialReviews, localReviews]);

  const sortedReviews = React.useMemo(() => {
    const reviews = [...allReviews];
    reviews.sort((a, b) => {
      if (sortBy === "newest") return getDateValue(b.date) - getDateValue(a.date);
      if (sortBy === "oldest") return getDateValue(a.date) - getDateValue(b.date);
      if (sortBy === "highest") return b.rating - a.rating || getDateValue(b.date) - getDateValue(a.date);
      return a.rating - b.rating || getDateValue(b.date) - getDateValue(a.date);
    });
    return reviews;
  }, [allReviews, sortBy]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const check = () => setIsMobileViewport(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setTranslatedReviews({});
    setShowOriginalMap({});
    setTranslationErrors({});
  }, [locale]);

  useEffect(() => {
    if (showAll) {
      setVisibleCount(REVIEWS_BATCH_SIZE);
      setPopupLoading(false);
    }
  }, [showAll, sortBy]);

  const anyDialogOpen = Boolean(selectedReview || showAll || showWrite);

  useEffect(() => {
    if (!anyDialogOpen) return;

    const scrollY = window.scrollY;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    const bodyPosition = document.body.style.position;
    const bodyTop = document.body.style.top;
    const bodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.body.style.position = bodyPosition;
      document.body.style.top = bodyTop;
      document.body.style.width = bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [anyDialogOpen]);

  useGSAP(
    () => {
      const container = ref.current;
      const stage = stageRef.current;
      const row1 = row1Ref.current;
      const row2 = row2Ref.current;
      const row3 = row3Ref.current;
      if (!container || !stage || !row1 || !row2 || !row3 || reducedMotion) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 0px)", () => {
        const { isLowEndMobile } = getMobilePerformanceProfile();
        const near = isMobileViewport ? (isLowEndMobile ? 24 : 40) : 100;
        const far = isMobileViewport ? (isLowEndMobile ? 48 : 80) : 160;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: container,
            start: isMobileViewport ? "top 88%" : "top 85%",
            end: isMobileViewport ? "bottom top" : "bottom 15%",
            scrub: isMobileViewport ? (isLowEndMobile ? 1.65 : 1.3) : 1,
            fastScrollEnd: isMobileViewport ? false : true,
            preventOverlaps: isMobileViewport ? false : "pinned",
            invalidateOnRefresh: true,
          },
        });

        tl.fromTo(
          stage,
          { opacity: 0.9 },
          { opacity: 1, ease: "none" },
          0
        );
        tl.fromTo(
          row1,
          { x: -near },
          { x: far, ease: "none", force3D: true }, // FIX: GPU compositing
          0
        );
        tl.fromTo(
          row2,
          { x: near },
          { x: -far, ease: "none", force3D: true }, // FIX: GPU compositing
          0
        );
        tl.fromTo(
          row3,
          { x: -near * 0.8 },
          { x: far * 0.9, ease: "none", force3D: true }, // FIX: GPU compositing
          0
        );

        return () => {
          tl.kill();
        };
      });

      return () => {
        mm.revert();
      };
    },
    { scope: ref, dependencies: [isMobileViewport, reducedMotion] }
  );

  const lightCards = Boolean(reducedMotion || isMobileViewport);
  const rowMaskStyle = {
    WebkitMaskImage: "linear-gradient(to right, transparent, black 16%, black 84%, transparent)",
    maskImage: "linear-gradient(to right, transparent, black 16%, black 84%, transparent)",
  };

  const { firstRow, secondRow, thirdRow } = React.useMemo(() => {
    const byNewest = [...allReviews].sort((a, b) => getDateValue(b.date) - getDateValue(a.date));
    const byTopRated = [...allReviews].sort((a, b) => b.rating - a.rating || getDateValue(b.date) - getDateValue(a.date));
    const byPopular = [...allReviews].sort((a, b) => {
      const scoreA = a.rating * 100 + Math.min((a.text || "").length, 260) + getDateValue(a.date) / 1e10;
      const scoreB = b.rating * 100 + Math.min((b.text || "").length, 260) + getDateValue(b.date) / 1e10;
      return scoreB - scoreA;
    });

    const takeUnique = (source: Review[], used: Set<string>) => {
      const out: Review[] = [];
      for (const r of source) {
        const id = getReviewId(r);
        if (used.has(id)) continue;
        used.add(id);
        out.push(r);
        if (out.length >= CAROUSEL_SOURCE_LIMIT) break;
      }
      return out;
    };

    const used = new Set<string>();
    const r1 = takeUnique(byNewest, used);
    const r2 = takeUnique(byTopRated, used);
    const r3 = takeUnique(byPopular, used);

    const ensureMin = (row: Review[], fallback: Review[]) => {
      if (row.length) return row;
      return fallback.slice(0, Math.min(CAROUSEL_MAX_PER_ROW, fallback.length));
    };
    const fb = byNewest;
    return {
      firstRow: ensureMin(r1, fb),
      secondRow: ensureMin(r2, fb),
      thirdRow: ensureMin(r3, fb),
    };
  }, [allReviews]);

  useEffect(() => {
    setRow1VisibleCount((prev) => {
      if (!firstRow.length) return 0;
      const minimum = Math.min(CAROUSEL_MAX_PER_ROW, firstRow.length);
      return Math.min(Math.max(prev, minimum), firstRow.length);
    });
    setRow2VisibleCount((prev) => {
      if (!secondRow.length) return 0;
      const minimum = Math.min(CAROUSEL_MAX_PER_ROW, secondRow.length);
      return Math.min(Math.max(prev, minimum), secondRow.length);
    });
    setRow3VisibleCount((prev) => {
      if (!thirdRow.length) return 0;
      const minimum = Math.min(CAROUSEL_MAX_PER_ROW, thirdRow.length);
      return Math.min(Math.max(prev, minimum), thirdRow.length);
    });
    setRow1Loading(false);
    setRow2Loading(false);
    setRow3Loading(false);
  }, [firstRow.length, secondRow.length, thirdRow.length]);

  const row1Items = React.useMemo(() => firstRow.slice(0, row1VisibleCount), [firstRow, row1VisibleCount]);
  const row2Items = React.useMemo(() => secondRow.slice(0, row2VisibleCount), [secondRow, row2VisibleCount]);
  const row3Items = React.useMemo(() => thirdRow.slice(0, row3VisibleCount), [thirdRow, row3VisibleCount]);
  const row1LoopItems = React.useMemo(() => createLoopedItems(row1Items), [row1Items]);
  const row2LoopItems = React.useMemo(() => createLoopedItems(row2Items), [row2Items]);
  const row3LoopItems = React.useMemo(() => createLoopedItems(row3Items), [row3Items]);
  const rowLoopLockRef = useRef({ 1: false, 2: false, 3: false });

  const maybeLoadMoreInRow = useCallback((row: RowId) => {
    if (row === 1) {
      if (row1Loading || row1VisibleCount >= firstRow.length) return false;
      setRow1Loading(true);
      window.setTimeout(() => {
        setRow1VisibleCount((prev) => Math.min(prev + REVIEWS_BATCH_SIZE, firstRow.length));
        setRow1Loading(false);
        setRowLoadCycles((prev) => prev + 1);
      }, 340);
      return true;
    }

    if (row === 2) {
      if (row2Loading || row2VisibleCount >= secondRow.length) return false;
      setRow2Loading(true);
      window.setTimeout(() => {
        setRow2VisibleCount((prev) => Math.min(prev + REVIEWS_BATCH_SIZE, secondRow.length));
        setRow2Loading(false);
        setRowLoadCycles((prev) => prev + 1);
      }, 340);
      return true;
    }

    if (row3Loading || row3VisibleCount >= thirdRow.length) return false;
    setRow3Loading(true);
    window.setTimeout(() => {
      setRow3VisibleCount((prev) => Math.min(prev + REVIEWS_BATCH_SIZE, thirdRow.length));
      setRow3Loading(false);
      setRowLoadCycles((prev) => prev + 1);
    }, 340);
    return true;
  }, [firstRow.length, row1Loading, row1VisibleCount, row2Loading, row2VisibleCount, row3Loading, row3VisibleCount, secondRow.length, thirdRow.length]);

  useEffect(() => {
    if (rowLoadCycles < AUTO_OPEN_SHOW_ALL_AFTER_ROW_LOADS) return;
    if (autoOpenedShowAllFromRowsRef.current || showAll || selectedReview || showWrite) return;
    autoOpenedShowAllFromRowsRef.current = true;
    setSortBy(DEFAULT_SHOW_ALL_SORT);
    setShowAll(true);
  }, [rowLoadCycles, selectedReview, showAll, showWrite]);

  const handleRowPointerDown = useCallback((row: RowId, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;

    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, select, label")) return;

    const state = rowDragStateRef.current[row];
    state.active = false;
    state.pointerId = e.pointerId;
    state.startX = e.clientX;
    state.startScrollLeft = e.currentTarget.scrollLeft;
    state.moved = false;
  }, []);

  const handleRowPointerMove = useCallback((row: RowId, e: React.PointerEvent<HTMLDivElement>) => {
    const state = rowDragStateRef.current[row];
    if (state.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - state.startX;

    if (!state.active && Math.abs(deltaX) > ROW_DRAG_SCROLL_THRESHOLD) {
      state.active = true;
      state.moved = true;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
    }

    if (state.active) {
      e.currentTarget.scrollLeft = state.startScrollLeft - deltaX;
    }
  }, []);

  const finishRowPointer = useCallback((row: RowId, e: React.PointerEvent<HTMLDivElement>) => {
    const state = rowDragStateRef.current[row];
    if (!state.active || state.pointerId !== e.pointerId) return;

    const pointerId = state.pointerId;
    if (pointerId !== null && e.currentTarget.hasPointerCapture(pointerId)) {
      e.currentTarget.releasePointerCapture(pointerId);
    }

    state.active = false;
    state.pointerId = null;
    state.startX = 0;
    state.startScrollLeft = 0;
    window.setTimeout(() => {
      state.moved = false;
    }, 0);
  }, []);

  const handleRowClickCapture = useCallback((row: RowId, e: React.MouseEvent<HTMLDivElement>) => {
    const state = rowDragStateRef.current[row];
    if (!state.moved) return;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const getInfiniteRowMetrics = useCallback((el: HTMLDivElement | null) => {
    if (!el || el.scrollWidth <= el.clientWidth) return null;
    const track = el.firstElementChild as HTMLDivElement | null;
    if (!track) return null;

    const segmentWidth = track.scrollWidth / CAROUSEL_LOOP_COPIES;
    if (!Number.isFinite(segmentWidth) || segmentWidth <= 0) return null;

    const styles = window.getComputedStyle(el);
    const paddingLeft = Number.parseFloat(styles.paddingLeft || "0") || 0;
    return { segmentWidth, paddingLeft };
  }, []);

  const centerInfiniteRow = useCallback((el: HTMLDivElement | null) => {
    const metrics = getInfiniteRowMetrics(el);
    if (!el || !metrics) return;
    el.scrollLeft = metrics.paddingLeft + metrics.segmentWidth;
  }, [getInfiniteRowMetrics]);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      centerInfiniteRow(row1Ref.current);
      centerInfiniteRow(row2Ref.current);
      centerInfiniteRow(row3Ref.current);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [centerInfiniteRow, isMobileViewport, row1LoopItems.length, row2LoopItems.length, row3LoopItems.length]);

  const handleInfiniteRowScroll = useCallback((row: 1 | 2 | 3, el: HTMLDivElement) => {
    const metrics = getInfiniteRowMetrics(el);
    if (!metrics || rowLoopLockRef.current[row]) return;

    const { segmentWidth, paddingLeft } = metrics;
    const leftBoundary = paddingLeft + segmentWidth * 0.35;
    const rightBoundary = paddingLeft + segmentWidth * 1.65;

    if (el.scrollLeft < leftBoundary) {
      void maybeLoadMoreInRow(row);
      rowLoopLockRef.current[row] = true;
      el.scrollLeft += segmentWidth;
      window.requestAnimationFrame(() => {
        rowLoopLockRef.current[row] = false;
      });
      return;
    }

    if (el.scrollLeft > rightBoundary) {
      void maybeLoadMoreInRow(row);
      rowLoopLockRef.current[row] = true;
      el.scrollLeft -= segmentWidth;
      window.requestAnimationFrame(() => {
        rowLoopLockRef.current[row] = false;
      });
    }
  }, [getInfiniteRowMetrics, maybeLoadMoreInRow]);

  const visibleReviews = sortedReviews.slice(0, visibleCount);
  const hasMoreReviews = visibleCount < sortedReviews.length;

  const maybeLoadMoreInPopup = useCallback((el: HTMLDivElement) => {
    const remaining = el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (remaining > 180 || popupLoading || !hasMoreReviews) return;

    setPopupLoading(true);
    window.setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + REVIEWS_BATCH_SIZE, sortedReviews.length));
      setPopupLoading(false);
    }, 360);
  }, [hasMoreReviews, popupLoading, sortedReviews.length]);

  useEffect(() => {
    if (!showAll || !showAllScrollRef.current) return;
    maybeLoadMoreInPopup(showAllScrollRef.current);
  }, [maybeLoadMoreInPopup, showAll, visibleCount]);

  const openReview = useCallback((r: Review) => {
    setSelectedReview(r);
  }, []);

  const closeReview = useCallback(() => {
    setSelectedReview(null);
  }, []);

  const openShowAll = useCallback(() => {
    setSortBy(DEFAULT_SHOW_ALL_SORT);
    setShowAll(true);
  }, []);

  const closeShowAll = useCallback(() => {
    setShowAll(false);
  }, []);

  const openWrite = useCallback(() => {
    setFormAvatarSeed(createRandomAvatarSeed());
    formOpenTimeRef.current = Date.now();
    setFormStatus("idle");
    setTurnstileToken("");
    setWriteModalSession((v) => v + 1);
    setShowWrite(true);
  }, []);

  const closeWrite = useCallback(() => {
    setTurnstileToken("");
    setWriteModalSession((v) => v + 1);
    setShowWrite(false);
  }, []);

  const openReviewFromShowAll = useCallback((review: Review) => {
    setSelectedReview(review);
  }, []);

  const translateReview = useCallback(async (review: Review) => {
    const reviewId = getReviewId(review);

    setTranslationErrors((prev) => {
      const next = { ...prev };
      delete next[reviewId];
      return next;
    });

    if (translatedReviews[reviewId]) {
      setShowOriginalMap((prev) => ({ ...prev, [reviewId]: !prev[reviewId] }));
      return;
    }

    const parsed = parseReviewText(review.text);
    const sourceText = parsed.originalText || parsed.sourceText || parsed.displayText;
    if (!sourceText) return;

    setTranslatingReviewId(reviewId);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText, targetLocale: locale }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.text || typeof data.text !== "string") {
        throw new Error("translate_failed");
      }

      setTranslatedReviews((prev) => ({ ...prev, [reviewId]: data.text.trim() }));
      setShowOriginalMap((prev) => ({ ...prev, [reviewId]: false }));
    } catch {
      setTranslationErrors((prev) => ({ ...prev, [reviewId]: t("testimonials.popup.translateError") }));
    } finally {
      setTranslatingReviewId((prev) => (prev === reviewId ? null : prev));
    }
  }, [locale, t, translatedReviews]);

  const activeReviewId = selectedReview ? getReviewId(selectedReview) : "";
  const activeParsedReview = selectedReview ? parseReviewText(selectedReview.text) : null;
  const activeTranslatedText = activeReviewId ? translatedReviews[activeReviewId] : undefined;
  const activeShowingOriginal = activeReviewId ? Boolean(showOriginalMap[activeReviewId]) : false;
  const activeReviewText = !selectedReview || !activeParsedReview
    ? ""
    : activeShowingOriginal
      ? (activeParsedReview.originalText || activeParsedReview.sourceText || activeParsedReview.displayText)
      : (activeTranslatedText || activeParsedReview.displayText);
  const activeTranslateLabel = activeTranslatedText
    ? (activeShowingOriginal ? t("testimonials.popup.translate") : t("testimonials.popup.showOriginal"))
    : t("testimonials.popup.translate");

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
          photos: photos.length > 0 ? photos.map(p => p.base64) : undefined,
          token: turnstileToken,
          hp: honeypot,
          formLoadedAt: formOpenTimeRef.current,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error("api failed");
      setLocalReviews(prev => [{
        name: finalName,
        role: "",
        date: new Date().toISOString().split("T")[0],
        text: formText.trim(),
        rating: formRating,
        photo: photos.length > 0 ? photos[0].preview : finalAvatar,
        photos: photos.length > 0 ? photos.map(p => p.preview) : undefined,
        isLocal: true,
        countryCode: typeof data?.countryCode === "string" ? data.countryCode : undefined,
        countryName: typeof data?.countryName === "string" ? data.countryName : undefined,
      }, ...prev]);
      setFormStatus("sent");
      setTurnstileToken("");
      setFormName("");
      setFormText("");
      setFormRating(5);
      setIsAnonymous(false);
      setPhotos([]);
      window.setTimeout(() => {
        closeWrite();
        setFormStatus("idle");
        setActiveTab("local");
      }, 1600);
    } catch {
      setFormStatus("error");
    }
  }, [formName, formRating, formText, getAvatarUrl, isAnonymous, closeWrite, turnstileToken, honeypot, photos]);

  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
    setShouldRenderTurnstile(Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) && !isLocalHost);
  }, []);

  return (
    <>
      <div
        id="testimonials"
        ref={ref}
        className={`relative z-30 isolate flex scroll-mt-24 flex-col justify-start overflow-visible pt-16 pb-20 antialiased sm:scroll-mt-32 sm:pt-20 sm:pb-24 md:pt-24 md:pb-28 ${reducedMotion ? "" : "sm:perspective-[1000px] sm:transform-3d"}`} /* FIX: disable 3D perspective on mobile to avoid expensive repaints */
        style={{
          background: "linear-gradient(180deg, #0A192F 0%, #0d2240 20%, #1a4a6e 55%, #5ba3d9 80%, #8ec5e8 100%)",
        }}
      >
        {/* ── Header ── */}
        <div data-testi-header className="relative z-40 mx-auto mb-6 w-full max-w-7xl px-4 text-center md:mb-8">
          <span className="mb-2 block font-body text-[10px] uppercase tracking-[0.25em] text-sand/50 sm:mb-3 sm:text-xs sm:tracking-[0.3em]">
            {t("testimonials.label")}
          </span>
          <h2 className="font-heading text-4xl text-white font-bold sm:text-5xl md:text-7xl">
            {t("testimonials.heading")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-sm leading-relaxed text-white/70 sm:mt-6 sm:text-base md:text-xl">
            {t("testimonials.description")}
          </p>
          <div className="mt-6 flex justify-center">
            <span className="inline-flex rounded-full border border-white/12 bg-white/6 px-4 py-1.5 font-body text-[10px] uppercase tracking-[0.24em] text-sand/75 backdrop-blur-sm sm:text-xs">
              {t("testimonials.latestLabel")}
            </span>
          </div>
        </div>

        {/* ── 3D Grid ── */}
        <div
          ref={stageRef}
          className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1800px] flex-col items-center gap-4 overflow-visible pointer-events-none sm:gap-8 lg:gap-10" /* FIX: removed will-change-transform — GSAP manages compositing via force3D */
        >
          <div className="pointer-events-none w-full px-[5vw] sm:px-[10vw]">
            <p className="mb-2 font-body text-[10px] uppercase tracking-[0.22em] text-sand/55 sm:text-xs">{uiCopy.rowLatest}</p>
          </div>
          <div className="relative mb-2 w-full sm:mb-3">
            <div ref={row1WrapRef} className="w-full md:will-change-transform" style={rowMaskStyle}>
              <div
                ref={row1Ref}
                data-testimonial-row="1"
                className="pointer-events-auto w-full min-h-0 overflow-x-auto overflow-y-visible px-[5vw] py-3 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-[10vw] md:cursor-grab md:active:cursor-grabbing"
                data-lenis-prevent-horizontal
                onPointerDown={(e) => handleRowPointerDown(1, e)}
                onPointerMove={(e) => handleRowPointerMove(1, e)}
                onPointerUp={(e) => finishRowPointer(1, e)}
                onPointerCancel={(e) => finishRowPointer(1, e)}
                onClickCapture={(e) => handleRowClickCapture(1, e)}
                onScroll={(e) => handleInfiniteRowScroll(1, e.currentTarget)}
              >
                <div
                  className="flex w-max min-h-0 flex-nowrap gap-6 overflow-visible snap-x snap-proximity sm:gap-12"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {row1LoopItems.map(({ review, copyIndex, baseIndex }) => (
                    <div
                      key={`${getReviewId(review)}-r1-${copyIndex}`}
                      className="flex shrink-0 snap-start items-center justify-center"
                      style={{ transform: !isMobileViewport && baseIndex % 2 === 1 ? "translateY(14px)" : undefined }}
                    >
                      <ReviewCard
                        review={review}
                        onClick={() => openReview(review)}
                        tilt={STICKER_TILTS[baseIndex % STICKER_TILTS.length]}
                        tapeColor={TAPE_COLORS[baseIndex % TAPE_COLORS.length]}
                        lightMode={lightCards}
                      />
                    </div>
                  ))}
                </div>
              </div>
              {row1Loading && <RowLoadingDots />}
            </div>
          </div>

          <div className="pointer-events-none w-full px-[5vw] sm:px-[10vw]">
            <p className="mb-2 font-body text-[10px] uppercase tracking-[0.22em] text-sand/55 sm:text-xs">{uiCopy.rowTopRated}</p>
          </div>
          <div className="relative mb-2 w-full sm:mb-3">
            <div ref={row2WrapRef} className="w-full md:will-change-transform" style={rowMaskStyle}>
              <div
                ref={row2Ref}
                data-testimonial-row="2"
                className="pointer-events-auto w-full min-h-0 overflow-x-auto overflow-y-visible px-[5vw] py-3 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-[10vw] md:cursor-grab md:active:cursor-grabbing"
                data-lenis-prevent-horizontal
                onPointerDown={(e) => handleRowPointerDown(2, e)}
                onPointerMove={(e) => handleRowPointerMove(2, e)}
                onPointerUp={(e) => finishRowPointer(2, e)}
                onPointerCancel={(e) => finishRowPointer(2, e)}
                onClickCapture={(e) => handleRowClickCapture(2, e)}
                onScroll={(e) => handleInfiniteRowScroll(2, e.currentTarget)}
              >
                <div
                  className="flex w-max min-h-0 flex-nowrap gap-6 overflow-visible snap-x snap-proximity sm:gap-12"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {row2LoopItems.map(({ review, copyIndex, baseIndex }) => (
                    <div
                      key={`${getReviewId(review)}-r2-${copyIndex}`}
                      className="flex shrink-0 snap-start items-center justify-center"
                      style={{ transform: !isMobileViewport && baseIndex % 2 === 0 ? "translateY(14px)" : undefined }}
                    >
                      <ReviewCard
                        review={review}
                        onClick={() => openReview(review)}
                        tilt={STICKER_TILTS[(baseIndex + 5) % STICKER_TILTS.length]}
                        tapeColor={TAPE_COLORS[(baseIndex + 5) % TAPE_COLORS.length]}
                        lightMode={lightCards}
                      />
                    </div>
                  ))}
                </div>
              </div>
              {row2Loading && <RowLoadingDots />}
            </div>
          </div>

          <div className="pointer-events-none w-full px-[5vw] sm:px-[10vw]">
            <p className="mb-2 font-body text-[10px] uppercase tracking-[0.22em] text-sand/55 sm:text-xs">{uiCopy.rowPopular}</p>
          </div>
          <div className="relative w-full">
            <div ref={row3WrapRef} className="w-full md:will-change-transform" style={rowMaskStyle}>
              <div
                ref={row3Ref}
                data-testimonial-row="3"
                className="pointer-events-auto w-full min-h-0 overflow-x-auto overflow-y-visible px-[5vw] py-3 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-[10vw] md:cursor-grab md:active:cursor-grabbing"
                data-lenis-prevent-horizontal
                onPointerDown={(e) => handleRowPointerDown(3, e)}
                onPointerMove={(e) => handleRowPointerMove(3, e)}
                onPointerUp={(e) => finishRowPointer(3, e)}
                onPointerCancel={(e) => finishRowPointer(3, e)}
                onClickCapture={(e) => handleRowClickCapture(3, e)}
                onScroll={(e) => handleInfiniteRowScroll(3, e.currentTarget)}
              >
                <div
                  className="flex w-max min-h-0 flex-nowrap gap-6 overflow-visible snap-x snap-proximity sm:gap-12"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {row3LoopItems.map(({ review, copyIndex, baseIndex }) => (
                    <div
                      key={`${getReviewId(review)}-r3-${copyIndex}`}
                      className="flex shrink-0 snap-start items-center justify-center"
                      style={{ transform: !isMobileViewport && baseIndex % 2 === 1 ? "translateY(14px)" : undefined }}
                    >
                      <ReviewCard
                        review={review}
                        onClick={() => openReview(review)}
                        tilt={STICKER_TILTS[(baseIndex + 10) % STICKER_TILTS.length]}
                        tapeColor={TAPE_COLORS[(baseIndex + 10) % TAPE_COLORS.length]}
                        lightMode={lightCards}
                      />
                    </div>
                  ))}
                </div>
              </div>
              {row3Loading && <RowLoadingDots />}
            </div>
          </div>
        </div>

        {/* ── CTA Buttons ── */}
        <div data-testi-cta className="relative z-80 mx-auto mt-16 flex w-full max-w-xl flex-col items-center justify-center space-y-4 px-4 pointer-events-auto md:mt-20 md:flex-row md:space-y-0 md:space-x-4">
          <button
            onClick={openShowAll}
            className="group/seeall relative inline-flex select-none items-center justify-center px-4 py-2 font-body text-sm font-medium uppercase tracking-[0.18em] text-sand transition-colors duration-300 hover:text-white sm:text-[15px] md:text-base mr-4 md:mr-0"
          >
            <span className="relative z-10">{`${t("testimonials.cta.button")} (${allReviews.length})`}</span>
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
                className="fixed inset-0 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
                style={{ zIndex: 100 }}
                onClick={closeReview}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 30, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 30, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0d2240] shadow-2xl"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <div className="relative h-40 w-full overflow-hidden">
                    <SafeReviewImage review={selectedReview} alt={selectedReview.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-linear-to-t from-[#0d2240] via-transparent to-transparent" />
                  </div>
                  <button
                    onClick={closeReview}
                    aria-label={uiCopy.close}
                    className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                  <div data-lenis-prevent className="relative z-10 -mt-8 flex-1 overflow-y-auto overscroll-contain px-6 pb-8">
                    <div className="flex items-end gap-4">
                      <SafeReviewImage review={selectedReview} alt={selectedReview.name} className="h-16 w-16 rounded-full border-2 border-[#0d2240] object-cover shadow-lg" />
                      <div className="min-w-0">
                        <p className="truncate font-heading text-lg text-sand">{selectedReview.name}</p>
                      </div>
                      <span className="ml-auto shrink-0 font-body text-xs text-sand/30">{selectedReview.date}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Stars count={selectedReview.rating} />
                      <ReviewOrigin review={selectedReview} locale={locale} />
                      <button
                        type="button"
                        onClick={() => void translateReview(selectedReview)}
                        disabled={translatingReviewId === activeReviewId}
                        className="ml-auto inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-body text-[11px] uppercase tracking-[0.18em] text-sand/80 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {translatingReviewId === activeReviewId ? t("testimonials.popup.translating") : activeTranslateLabel}
                      </button>
                    </div>
                    {activeReviewId && translationErrors[activeReviewId] && (
                      <p className="mt-3 font-body text-xs text-amber-200/90">
                        {translationErrors[activeReviewId]}
                      </p>
                    )}
                    <p className="mt-4 font-body text-base leading-relaxed text-sand/80">
                      &ldquo;{activeReviewText}&rdquo;
                    </p>
                    {selectedReview.photos && selectedReview.photos.length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-2.5">
                        {selectedReview.photos.map((url, idx) => (
                          <div
                            key={`${activeReviewId}-p-${idx}`}
                            className="group relative h-20 w-20 flex-shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:scale-[1.04] hover:shadow-xl sm:h-24 sm:w-24"
                            onClick={() => window.open(url, "_blank")}
                          >
                            <img
                              src={url}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                          </div>
                        ))}
                      </div>
                    )}
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
                className="fixed inset-0 bg-black/70 p-3 backdrop-blur-lg sm:p-6"
                style={{ zIndex: 90 }}
                onClick={closeShowAll}
              >
                <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <div className="relative flex h-full max-h-[92dvh] w-full flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#071a33]/95 shadow-2xl">
                    <button
                      onClick={closeShowAll}
                      aria-label={uiCopy.close}
                      className="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60"
                      style={{ zIndex: 50 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>

                    <div
                      ref={showAllScrollRef}
                      data-lenis-prevent
                      className="flex-1 overflow-y-auto overscroll-contain px-4 py-16 md:px-8"
                      onScroll={(e) => maybeLoadMoreInPopup(e.currentTarget)}
                    >
                      <div className="mb-10 text-center">
                        <span className="mb-2 block font-body text-xs uppercase tracking-[0.3em] text-sand/40">
                          {t("testimonials.popup.label")}
                        </span>
                        <h3 className="font-heading text-3xl text-sand md:text-5xl" style={{ fontWeight: 400 }}>
                          {t("testimonials.popup.heading")}
                        </h3>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          <span className="inline-flex rounded-full border border-ocean/25 bg-ocean/10 px-4 py-1.5 font-body text-[10px] uppercase tracking-[0.22em] text-sand/75 sm:text-xs">
                            {t(`testimonials.sort.${sortBy}` as Parameters<typeof t>[0])}
                          </span>
                          {sortBy === "highest" && (
                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-body text-[10px] uppercase tracking-[0.22em] text-sand/60 sm:text-xs">
                              {t("testimonials.popup.latestFirst")}
                            </span>
                          )}
                          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-body text-[10px] uppercase tracking-[0.22em] text-sand/60 sm:text-xs">
                            {t("testimonials.popup.loadedCount")} {Math.min(visibleCount, sortedReviews.length)} / {sortedReviews.length}
                          </span>
                        </div>
                      </div>

                      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
                        {(["newest", "oldest", "highest", "lowest"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setSortBy(s)}
                            className={`rounded-full border px-4 py-1.5 font-body text-xs tracking-wide transition-all duration-200
                          ${sortBy === s ? "border-ocean bg-ocean/20 text-white shadow-[0_2px_10px_rgba(0,0,0,0.1)]" : "border-white/15 bg-white/5 text-sand/50 hover:border-white/30 hover:text-sand/80"}`}
                          >
                            {t(`testimonials.sort.${s}` as Parameters<typeof t>[0])}
                          </button>
                        ))}
                      </div>

                      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                        {visibleReviews.map((review, i) => {
                          const parsedText = parseReviewText(review.text);
                          return (
                            <motion.div
                              key={getReviewId(review)}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.4 }}
                              className="mb-4 break-inside-avoid cursor-pointer rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 hover:border-ocean/30 hover:bg-white/10"
                              onClick={() => openReviewFromShowAll(review)}
                            >
                              <div className="flex items-center gap-3">
                                <SafeReviewImage review={review} alt={review.name} className="h-10 w-10 rounded-full border border-sand/20 object-cover" />
                                <div className="min-w-0">
                                  <p className="truncate font-body text-sm font-medium text-sand">{review.name}</p>
                                </div>
                                <span className="ml-auto shrink-0 font-body text-[10px] text-sand/30">{review.date}</span>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Stars count={review.rating} />
                                <ReviewOrigin review={review} locale={locale} />
                              </div>
                              <p className="mt-3 font-body text-sm leading-relaxed text-sand/70">
                                &ldquo;{parsedText.displayText}&rdquo;
                              </p>
                            </motion.div>
                          );
                        })}
                      </div>

                      {popupLoading && (
                        <div className="mt-8 flex justify-center">
                          <InlineLoadingDots />
                        </div>
                      )}

                      <div className="mt-12 text-center">
                        <p className="font-body text-sm text-sand/40">
                          {t("testimonials.popup.bottom")}
                        </p>
                      </div>
                    </div>
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
                onClick={closeWrite}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 30, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, y: 30, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="relative w-full max-w-[92vw] sm:max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d2240] p-4 sm:p-6 shadow-2xl"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={closeWrite}
                    className="absolute right-3 top-3 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70"
                    aria-label={uiCopy.close}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>

                  {/* ── Thank-you toast overlay ── */}
                  <AnimatePresence>
                    {formStatus === "sent" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 24 }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl bg-[#0d2240]/98 backdrop-blur-sm"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
                          className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-400/40"
                        >
                          <svg className="h-8 w-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </motion.div>
                        <h4 className="font-heading text-2xl text-sand sm:text-3xl" style={{ fontWeight: 400 }}>
                          {uiCopy.thankYouTitle}
                        </h4>
                        <p className="mt-2 max-w-xs px-6 text-center font-body text-sm leading-relaxed text-sand/70">
                          {uiCopy.thankYouMessage}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                      {uiCopy.tabLocal}
                    </button>
                    <button
                      onClick={() => setActiveTab("google")}
                      className={`flex-1 rounded-md py-2.5 text-center font-body text-[13px] font-medium transition-all ${
                        activeTab === "google" ? "bg-blue-600 text-white shadow-[0_2px_10px_rgba(0,0,0,0.1)]" : "text-sand/50 hover:text-sand hover:bg-white/5"
                      }`}
                    >
                      {uiCopy.tabGoogle}
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
                            alt={uiCopy.avatarPreviewAlt}
                            className="h-14 w-14 rounded-full border border-ocean/40 bg-navy object-cover shadow-lg"
                          />
                          <div className="flex-1">
                            <label className="mb-1 block font-body text-[11px] uppercase tracking-[0.18em] text-sand/50">
                              {t("contact.name")}
                            </label>
                            <input
                              type="text"
                              required
                              value={formName}
                              onChange={(e) => setFormName(e.target.value)}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-body text-sm text-sand placeholder:text-sand/30 focus:border-ocean/60 focus:bg-white/10 focus:outline-none"
                              placeholder={t("contact.namePlaceholder")}
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
                            {uiCopy.anonymous} {formName && <span className="opacity-60">({getAnonymizedName(formName)})</span>}
                          </span>
                        </label>

                        <div>
                          <label className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.18em] text-sand/50">
                            {uiCopy.photosMeta}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {photos.map((p, i) => (
                              <div key={i} className="relative h-16 w-16">
                                <img src={p.preview} alt={`${t("testimonials.write.photos")} ${i + 1}`} className="h-16 w-16 rounded-lg border border-ocean/40 object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                  aria-label={uiCopy.removePhoto}
                                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/80 text-white text-[10px] leading-none"
                                >✕</button>
                              </div>
                            ))}
                            {photos.length < 3 && (
                              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 transition-colors hover:border-white/40 hover:bg-white/10">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="sr-only"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []).slice(0, 3 - photos.length);
                                    files.forEach(file => {
                                      if (file.size > PHOTO_UPLOAD_LIMIT_BYTES) { alert(uiCopy.photoTooLarge); return; }
                                      const img = new Image();
                                      const url = URL.createObjectURL(file);
                                      img.onload = () => {
                                        const MAX = 1200;
                                        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                                        const canvas = document.createElement("canvas");
                                        canvas.width = Math.round(img.width * scale);
                                        canvas.height = Math.round(img.height * scale);
                                        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
                                        const compressed = canvas.toDataURL("image/jpeg", 0.75);
                                        URL.revokeObjectURL(url);
                                        setPhotos(prev => prev.length < 3 ? [...prev, { base64: compressed, preview: compressed }] : prev);
                                      };
                                      img.src = url;
                                    });
                                    e.target.value = "";
                                  }}
                                />
                                <svg className="h-5 w-5 text-sand/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 5v14M5 12h14" />
                                </svg>
                                <span className="mt-0.5 font-body text-[9px] text-sand/30">{photos.length}/3</span>
                              </label>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.18em] text-sand/50">
                            {t("testimonials.write.rating")}
                          </label>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => {
                              const v = i + 1;
                              return (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setFormRating(v)}
                                  disabled={formStatus === "sending" || formStatus === "sent"}
                                  className="rounded-full p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed"
                                  aria-label={`${t("testimonials.write.rating")} ${v}`}
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
                          <label className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.18em] text-sand/50">
                            {t("contact.message")}
                          </label>
                          <textarea
                            required
                            rows={isMobileViewport ? 4 : 5}
                            value={formText}
                            onChange={(e) => setFormText(e.target.value)}
                            className={`w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 font-body text-sm text-sand placeholder:text-sand/30 focus:border-ocean/60 focus:bg-white/10 focus:outline-none ${isMobileViewport ? "min-h-[96px]" : "min-h-[120px]"}`}
                            placeholder={t("contact.messagePlaceholder")}
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
                        {shouldRenderTurnstile && showWrite && activeTab === "local" && (
                          <div
                            key={`review-turnstile-wrap-${writeModalSession}`}
                            style={{
                              transform: isMobileViewport ? "scale(0.82)" : "scale(1)",
                              transformOrigin: "left center",
                              minHeight: isMobileViewport ? "72px" : "65px",
                              overflow: "visible",
                            }}
                          >
                            <Turnstile
                              key={`review-turnstile-${writeModalSession}`}
                              id={`review-turnstile-${writeModalSession}`}
                              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
                              onSuccess={setTurnstileToken}
                              onError={() => setTurnstileToken("")}
                              options={{ theme: "dark", size: "normal" }}
                              className="mt-1"
                            />
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={formStatus === "sending" || formStatus === "sent"}
                          className="mt-5 flex w-full items-center justify-center rounded-full bg-ocean px-6 py-3.5 font-body text-sm font-semibold uppercase tracking-widest text-white shadow-[0_8px_20px_-6px_rgba(59,130,196,0.5)] transition-all duration-300 hover:bg-ocean/90 hover:scale-[1.02] disabled:hover:scale-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {formStatus === "sending"
                            ? t("testimonials.write.sending")
                            : formStatus === "sent"
                            ? t("testimonials.write.sent")
                            : formStatus === "error"
                            ? t("testimonials.write.error")
                            : t("testimonials.write.submit")}
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
                          {uiCopy.googleHeading}
                        </h4>
                        <p className="mb-8 max-w-xs font-body text-[13px] leading-relaxed text-sand/70">
                          {uiCopy.googleDescription}
                        </p>
                        <a
                          href="https://g.page/r/CUKVPm5VC_ClEBM/review"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex w-full items-center justify-center gap-3 rounded-full bg-blue-600 px-6 py-3.5 font-body text-[13px] font-semibold uppercase tracking-widest text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] transition-all hover:bg-blue-700 hover:scale-[1.02] hover:shadow-[0_12px_24px_-8px_rgba(37,99,235,0.6)]"
                        >
                          {uiCopy.googleButton}
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
