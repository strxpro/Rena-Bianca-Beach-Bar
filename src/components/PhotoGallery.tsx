"use client";

import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/i18n/I18nProvider";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   PHOTO GALLERY — Stacked card carousel (Supahfunk style)
   ─────────────────────────────────────────────────────────────
   • Scroll reveals first 3 cards smoothly
   • Drag / touch to browse remaining cards
   • Direct DOM manipulation — no React re-renders during animation
   ═══════════════════════════════════════════════════════════════ */

type MediaSize = {
  mediaUrl: string;
  height: number;
  width: number;
};

type MediaSizes = {
  small?: MediaSize;
  medium?: MediaSize;
  large?: MediaSize;
  full?: MediaSize;
};

type BeholdPost = {
  id: string;
  timestamp: string;
  permalink?: string;
  mediaType: "IMAGE" | "CAROUSEL_ALBUM" | "VIDEO" | string;
  mediaUrl?: string;
  caption?: string | null;
  prunedCaption?: string | null;
  sizes?: MediaSizes;
  children?: Array<{
    id: string;
    mediaType?: string;
    mediaUrl?: string;
    sizes?: MediaSizes;
  }>;
};

type BeholdFeed = {
  username?: string;
  posts?: BeholdPost[];
};

type GalleryItem = {
  id: string;
  title: string;
  num: string;
  src: string;
  fullSrc: string;
  href?: string;
  isExternal?: boolean;
};

const FALLBACK_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "fallback-01",
    title: "Aperol Spritz",
    num: "01",
    src: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=800&fit=crop&q=80",
    fullSrc: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&h=1600&fit=crop&q=90",
  },
  {
    id: "fallback-02",
    title: "Taras",
    num: "02",
    src: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=800&fit=crop&q=80",
    fullSrc: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&h=1600&fit=crop&q=90",
  },
  {
    id: "fallback-03",
    title: "Pasta",
    num: "03",
    src: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&h=800&fit=crop&q=80",
    fullSrc: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1200&h=1600&fit=crop&q=90",
  },
  {
    id: "fallback-04",
    title: "Zachód słońca",
    num: "04",
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=800&fit=crop&q=80",
    fullSrc: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=1600&fit=crop&q=90",
  },
  {
    id: "fallback-05",
    title: "Koktajle",
    num: "05",
    src: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&h=800&fit=crop&q=80",
    fullSrc: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=1200&h=1600&fit=crop&q=90",
  },
  {
    id: "fallback-06",
    title: "Wnętrze",
    num: "06",
    src: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=800&fit=crop&q=80",
    fullSrc: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=1600&fit=crop&q=90",
  },
];

const MAX_GALLERY_POSTS = 6;
const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/renabiancabeachbar/";
const INTRO_ACTIVE = 0;
const SPEED_DRAG = -0.3;
const INSTAGRAM_POPUP_THRESHOLD = 106;
const GALLERY_SCROLL_PROGRESS_MAX = 112;
const GALLERY_SCROLL_STEP_PERCENT = 72;

const getInstagramUrl = (username?: string) => {
  return username ? `https://www.instagram.com/${username}/` : DEFAULT_INSTAGRAM_URL;
};

const mapGalleryScrollProgress = (scrollProgress: number) => {
  const clampedProgress = Math.max(0, Math.min(scrollProgress, 1));
  return clampedProgress * GALLERY_SCROLL_PROGRESS_MAX;
};

const getPostImage = (post: BeholdPost, variant: "large" | "full") => {
  return (
    post.sizes?.[variant]?.mediaUrl ??
    post.children?.[0]?.sizes?.[variant]?.mediaUrl ??
    (variant === "full"
      ? post.sizes?.large?.mediaUrl ?? post.children?.[0]?.sizes?.large?.mediaUrl
      : post.sizes?.medium?.mediaUrl ?? post.children?.[0]?.sizes?.medium?.mediaUrl) ??
    post.children?.[0]?.mediaUrl ??
    post.mediaUrl ??
    ""
  );
};

const getPostTitle = (post: BeholdPost) => {
  const rawCaption = (post.prunedCaption || post.caption || "").trim();
  const firstLine = rawCaption.split("\n").find(Boolean)?.trim() || "Instagram";
  const normalized = firstLine.replace(/\s+/g, " ");
  return normalized.length > 36 ? `${normalized.slice(0, 33)}…` : normalized;
};

const mapBeholdPostsToGalleryItems = (posts: BeholdPost[]) => {
  return posts
    .filter((post) => (post.mediaType === "IMAGE" || post.mediaType === "CAROUSEL_ALBUM") && Boolean(getPostImage(post, "large")))
    .slice(0, MAX_GALLERY_POSTS)
    .map((post, index) => ({
      id: post.id,
      title: getPostTitle(post),
      num: String(index + 1).padStart(2, "0"),
      src: getPostImage(post, "large"),
      fullSrc: getPostImage(post, "full") || getPostImage(post, "large"),
      href: post.permalink || DEFAULT_INSTAGRAM_URL,
    }));
};

export default function PhotoGallery() {
  const { t } = useI18n();
  const configuredInstagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "";
  const beholdFeedUrl = process.env.NEXT_PUBLIC_BEHOLD_FEED_URL?.trim() || "";
  const sectionRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const teaserHintRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hoveredCardIndexRef = useRef<number | null>(null);
  const teaserCardIndexRef = useRef(Math.max(FALLBACK_GALLERY_ITEMS.length - 1, 0));
  const [photoItems, setPhotoItems] = useState<GalleryItem[]>(FALLBACK_GALLERY_ITEMS);
  const [instagramUrl, setInstagramUrl] = useState<string>(configuredInstagramUrl || DEFAULT_INSTAGRAM_URL);
  const [showInstagramPopup, setShowInstagramPopup] = useState(false);
  const popupVisibleRef = useRef(false);
  const galleryItems = photoItems;
  const lightboxItems = useMemo(() => photoItems.slice(0, Math.max(photoItems.length - 1, 0)), [photoItems]);
  const galleryItemsRef = useRef<GalleryItem[]>(galleryItems);
  const progressRef = useRef(0);
  const startXRef = useRef(0);
  const isDownRef = useRef(false);
  const draggedRef = useRef(false);
  const rafRef = useRef(0);

  /* ── Direct DOM update — no React state, no re-renders ── */
  const applyLayout = useCallback(() => {
    const count = galleryItemsRef.current.length;
    if (!count) {
      if (popupVisibleRef.current) {
        popupVisibleRef.current = false;
        setShowInstagramPopup(false);
      }
      return;
    }

    const clampedProgress = Math.max(0, Math.min(progressRef.current, 100));
    const activeSpan = Math.max(count - 1, 0);
    const active = INTRO_ACTIVE + (clampedProgress / 100) * activeSpan;
    const shouldShowInstagramPopup = progressRef.current > INSTAGRAM_POPUP_THRESHOLD;

    if (popupVisibleRef.current !== shouldShowInstagramPopup) {
      popupVisibleRef.current = shouldShowInstagramPopup;
      setShowInstagramPopup(shouldShowInstagramPopup);
    }

    for (let i = 0; i < count; i++) {
      const card = cardRefs.current[i];
      const overlay = overlayRefs.current[i];
      const image = imageRefs.current[i];
      const teaserHint = teaserHintRefs.current[i];
      if (!card) continue;

      const distance = i - active;
      const offset = distance / count;
      const x = offset * 500;
      const y = offset * 120;
      const rot = offset * 80;
      const zi = Math.max(1, Math.round(count - Math.abs(distance) * 2));
      const opacity = Math.max(0, Math.min(1, 1 - Math.max(0, Math.abs(distance) - 1.25) * 0.55));
      const isTeaserCard = i === teaserCardIndexRef.current;
      const hoverReveal = hoveredCardIndexRef.current === i ? 1 : 0;
      const overscrollReveal = isTeaserCard ? Math.min(Math.max(progressRef.current - (INSTAGRAM_POPUP_THRESHOLD - 4), 0) / 10, 0.78) : 0;
      const teaserReveal = isTeaserCard ? Math.max(hoverReveal, overscrollReveal) : 0;

      card.style.zIndex = String(zi);
      card.style.transform = `translate(${x}%, ${y}%) rotate(${rot}deg)`;
      if (overlay) overlay.style.opacity = String(opacity);
      if (image) {
        image.style.transform = `scale(${1 + teaserReveal * 0.08})`;
        image.style.filter = `blur(${(teaserReveal * 3).toFixed(2)}px) brightness(${(1 - teaserReveal * 0.22).toFixed(3)}) saturate(${(1 - teaserReveal * 0.25).toFixed(3)})`;
      }
      if (teaserHint) {
        teaserHint.style.opacity = String(teaserReveal);
        teaserHint.style.transform = `scale(${0.92 + teaserReveal * 0.08})`;
      }
    }
  }, []);

  /* ── Batched RAF update ── */
  const scheduleUpdate = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(applyLayout);
  }, [applyLayout]);

  /* Initial render + RAF cleanup */
  useEffect(() => {
    applyLayout();
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [applyLayout]);

  useEffect(() => {
    if (!beholdFeedUrl) return;

    const controller = new AbortController();

    const loadFeed = async () => {
      try {
        const response = await fetch(beholdFeedUrl, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) return;

        const feed = (await response.json()) as BeholdFeed;
        const nextItems = mapBeholdPostsToGalleryItems(feed.posts ?? []);

        if (nextItems.length > 0) {
          setPhotoItems(nextItems);
        }

        if (!configuredInstagramUrl && feed.username) {
          setInstagramUrl(getInstagramUrl(feed.username));
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
      }
    };

    void loadFeed();

    return () => controller.abort();
  }, [beholdFeedUrl, configuredInstagramUrl]);

  useEffect(() => {
    galleryItemsRef.current = galleryItems;
    cardRefs.current = cardRefs.current.slice(0, galleryItems.length);
    overlayRefs.current = overlayRefs.current.slice(0, galleryItems.length);
    imageRefs.current = imageRefs.current.slice(0, galleryItems.length);
    teaserHintRefs.current = teaserHintRefs.current.slice(0, galleryItems.length);
    teaserCardIndexRef.current = Math.max(photoItems.length - 1, 0);
    applyLayout();
  }, [applyLayout, galleryItems, photoItems.length]);

  /* ── ScrollTrigger: pin + scrub first 3 cards ──────────────────────
     NOTE about fast-scroll stability:
     • scrub: 1 → a touch of lag so Lenis's smooth-scroll inertia doesn't
       race ahead of the DOM writes in onUpdate.
     • anticipatePin: 1 → GSAP shifts the pin a frame earlier when the
       section is approached fast → no visible jump at the pin boundary.
     • invalidateOnRefresh: true → recalculates end distance on resize
       so the pin-spacer stays correct at any viewport size.
     • NO snap: snap + Lenis smooth-scroll fights with the user's own
       momentum and causes the "jumping" you saw on fast scroll.
     ─────────────────────────────────────────────────────────────── */
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const isMob = typeof window !== "undefined" && window.innerWidth < 768;
      ScrollTrigger.create({
        trigger: section,
        start: isMob ? "top 8%" : "top 80px",
        end: () => `+=${Math.max(260, Math.max(galleryItemsRef.current.length - 1, 1) * GALLERY_SCROLL_STEP_PERCENT)}%`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        /* Clamp fast swipes + join the shared `"pinned"` group
           so the gallery carousel can't be skipped in a single
           fling gesture on mobile. */
        fastScrollEnd: !isMob,
        preventOverlaps: isMob ? false : "pinned",
        onUpdate: (self) => {
          progressRef.current = mapGalleryScrollProgress(self.progress);
          // #region agent log
          // #endregion
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(applyLayout);
        },
      });
    },
    { scope: sectionRef }
  );

  /* ── Pointer handlers (desktop drag) ── */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    isDownRef.current = true;
    draggedRef.current = false;
    startXRef.current = e.clientX;
    const el = carouselRef.current;
    if (el) el.style.cursor = "grabbing";
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      if (!isDownRef.current) return;
      e.preventDefault();
      const x = e.clientX;
      const delta = x - startXRef.current;
      if (Math.abs(delta) > 3) draggedRef.current = true;
      progressRef.current += delta * SPEED_DRAG;
      startXRef.current = x;
      scheduleUpdate();
    },
    [scheduleUpdate]
  );

  const onPointerUp = useCallback((e?: React.PointerEvent) => {
    if (e && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    isDownRef.current = false;
    const el = carouselRef.current;
    if (el) el.style.cursor = "grab";
  }, []);

  /* ── Lightbox state ── */
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIdx !== null && lightboxIdx >= lightboxItems.length) {
      setLightboxIdx(null);
    }
  }, [lightboxIdx, lightboxItems.length]);

  /* ── Card click — opens lightbox ── */
  const onCardClick = useCallback(
    (i: number) => {
      if (draggedRef.current) return;

      const teaserIndex = Math.max(galleryItemsRef.current.length - 1, 0);

      if (i === teaserIndex && galleryItemsRef.current.length > 0) {
        window.open(instagramUrl, "_blank", "noopener,noreferrer");
        return;
      }

      setLightboxIdx(i);
    },
    [instagramUrl]
  );

  const activeLightboxItem = lightboxIdx !== null ? lightboxItems[lightboxIdx] ?? null : null;

  return (
    <section
      id="gallery"
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0A192F 0%, #122a4a 50%, #0A192F 100%)",
        height: "100dvh",
      }}
    >
      {/* Section heading — z-30 so it's ALWAYS above the shuffled cards
           (cards can reach zIndex:10 at most via applyLayout). The heading
           also has a subtle backdrop blur on small screens so if a card
           slides close it reads as a legible title, not cropped text. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-0.5 px-4 pt-20 text-center sm:pt-24 md:pt-28">
        <span className="rounded-full bg-navy/30 px-3 py-0.5 font-body text-[9px] uppercase tracking-[0.25em] text-sand/60 backdrop-blur-sm sm:bg-transparent sm:px-0 sm:py-0 sm:text-[10px] sm:text-sand/40 sm:tracking-[0.3em] sm:backdrop-blur-0">
          {t("gallery.label")}
        </span>
        <h2
          className="font-heading text-xl text-sand drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] sm:text-2xl md:text-4xl lg:text-5xl"
          style={{ fontWeight: 400 }}
        >
          {t("gallery.heading")}
        </h2>
      </div>

      {/* Carousel —
           No onWheel handler here on purpose: the pinned section is
           already driven by ScrollTrigger (which reads Lenis smooth-scroll),
           so any extra wheel-to-progress writes would race against
           the ScrollTrigger progress and cause jitter / "jumping" on
           fast scrolls. Drag and touch are the only ways to browse
           past the first 3 cards — same UX, clean state. */}
      <div
        ref={carouselRef}
        className="relative h-full w-full"
        style={{ cursor: "grab", touchAction: "manipulation" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => onPointerUp(e)}
        onPointerCancel={(e) => onPointerUp(e)}
        onPointerLeave={(e) => onPointerUp(e)}
      >
        {galleryItems.map((item, i) => {
          const isTeaserCard = i === galleryItems.length - 1;

          return (
            <div
              key={item.id}
              ref={(el) => { cardRefs.current[i] = el; }}
              className="absolute left-1/2 top-1/2 overflow-hidden rounded-xl md:will-change-transform"
              style={{
                width: "clamp(200px, 45vw, 300px)",
                height: "clamp(280px, 60vw, 400px)",
                marginTop: "calc(clamp(280px, 60vw, 400px) * -0.5)",
                marginLeft: "calc(clamp(200px, 45vw, 300px) * -0.5)",
                transformOrigin: "0% 100%",
                boxShadow: "0 10px 50px 10px rgba(0,0,0,0.5)",
                background: "#0A192F",
                pointerEvents: "all",
                userSelect: "none",
              }}
              onClick={() => onCardClick(i)}
              onMouseEnter={() => {
                hoveredCardIndexRef.current = i;
                scheduleUpdate();
              }}
              onMouseLeave={() => {
                if (hoveredCardIndexRef.current === i) {
                  hoveredCardIndexRef.current = null;
                  scheduleUpdate();
                }
              }}
            >
              <div
                ref={(el) => { overlayRefs.current[i] = el; }}
                className="pointer-events-none absolute inset-0 z-10"
                style={{ transition: "opacity 0.4s cubic-bezier(0, 0.02, 0, 1)" }}
              >
                <div
                  className="absolute inset-0 z-10"
                  style={{
                    background: "linear-gradient(to bottom, rgba(0,0,0,0.3), transparent 30%, transparent 50%, rgba(0,0,0,0.5))",
                  }}
                />
                {isTeaserCard && (
                  <div
                    ref={(el) => { teaserHintRefs.current[i] = el; }}
                    className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-6 text-center opacity-0"
                    style={{ transition: "opacity 0.35s ease, transform 0.35s ease", transform: "scale(0.92)" }}
                  >
                    <div className="absolute inset-0 bg-black/16" />
                    <div className="relative rounded-full border border-white/20 bg-black/25 px-4 py-2 font-body text-[10px] uppercase tracking-[0.28em] text-sand/85 backdrop-blur-sm">
                      {t("gallery.viewMore")}
                    </div>
                  </div>
                )}
                <div
                  className="absolute bottom-5 left-5 z-20 font-heading text-sand"
                  style={{ fontSize: "clamp(18px, 3vw, 28px)", textShadow: "0 4px 4px rgba(0,0,0,0.2)" }}
                >
                  {item.title}
                </div>
                <div
                  className="absolute left-5 top-3 z-20 font-heading text-sand/80"
                  style={{ fontSize: "clamp(20px, 8vw, 64px)" }}
                >
                  {item.num}
                </div>
              </div>
              <img
                ref={(el) => { imageRefs.current[i] = el; }}
                src={item.src}
                alt={item.title}
                className="pointer-events-none h-full w-full object-cover"
                style={{ transition: "transform 0.35s ease, filter 0.35s ease", transform: "scale(1)", filter: "none" }}
                draggable={false}
                loading="lazy"
              />
            </div>
          );
        })}
      </div>

      <div
        className={`absolute bottom-5 right-4 z-40 transition-all duration-300 sm:bottom-6 sm:right-6 ${showInstagramPopup ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
      >
        <div className="rounded-[22px] border border-white/15 bg-[#071426]/78 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/8 text-sand/90">
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-heading text-sm text-sand">{t("gallery.openInstagram")}</div>
              <div className="font-body text-[10px] uppercase tracking-[0.22em] text-sand/55">{t("gallery.viewMore")}</div>
            </div>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 inline-flex shrink-0 items-center rounded-full border border-ocean/35 bg-ocean/15 px-3 py-2 font-body text-[10px] uppercase tracking-[0.22em] text-sand transition-colors hover:border-ocean/55 hover:bg-ocean/25"
            >
              {t("gallery.viewMore")}
            </a>
          </div>
        </div>
      </div>

      {/* Decorative side line — hidden on small screens to avoid overflow */}
      <div className="pointer-events-none absolute left-[90px] top-0 z-0 hidden h-full w-[10px] border-x border-white/15 sm:block" />

      {/* Bottom text — hidden on mobile to avoid clipping */}
      <div
        className="pointer-events-none absolute bottom-0 left-[30px] z-0 hidden origin-[0%_10%] -rotate-90 font-body text-[9px] uppercase leading-relaxed text-sand/40 sm:block"
      >
        Rena Bianca<br />Beach Bar & Restaurant<br />Sardynia, Włochy
      </div>

      {/* ═══ LIGHTBOX — full-screen photo pop-out ═══ */}
      {activeLightboxItem && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/85 backdrop-blur-md"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Prev */}
          {lightboxIdx !== null && lightboxIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition-colors hover:bg-white/20"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}

          {/* Next */}
          {lightboxIdx !== null && lightboxIdx < lightboxItems.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition-colors hover:bg-white/20"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}

          {/* Image */}
          <div className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={activeLightboxItem.fullSrc}
              alt={activeLightboxItem.title}
              className="block max-h-[85vh] max-w-[90vw] object-contain"
            />
            <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/60 to-transparent px-4 pb-3 pt-8">
              <span className="font-body text-xs uppercase tracking-widest text-sand/60">{activeLightboxItem.num}</span>
              <h3 className="font-heading text-lg text-sand">{activeLightboxItem.title}</h3>
            </div>
          </div>
        </div>,
        document.body
      )}

    </section>
  );
}
