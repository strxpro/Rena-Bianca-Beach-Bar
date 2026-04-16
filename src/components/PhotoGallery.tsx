"use client";

import { useRef, useCallback, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   PHOTO GALLERY — Stacked card carousel (Supahfunk style)
   ─────────────────────────────────────────────────────────────
   • Scroll reveals first 3 cards smoothly
   • Drag / touch to browse remaining cards
   • Direct DOM manipulation — no React re-renders during animation
   ═══════════════════════════════════════════════════════════════ */

const GALLERY_ITEMS = [
  { title: "Aperol Spritz", num: "01", src: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=800&fit=crop&q=80" },
  { title: "Taras", num: "02", src: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=800&fit=crop&q=80" },
  { title: "Pasta", num: "03", src: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&h=800&fit=crop&q=80" },
  { title: "Zachód słońca", num: "04", src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=800&fit=crop&q=80" },
  { title: "Koktajle", num: "05", src: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=600&h=800&fit=crop&q=80" },
  { title: "Wnętrze", num: "06", src: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=800&fit=crop&q=80" },
  { title: "Owoce morza", num: "07", src: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=600&h=800&fit=crop&q=80" },
  { title: "Plaża", num: "08", src: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&h=800&fit=crop&q=80" },
  { title: "Wino", num: "09", src: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=800&fit=crop&q=80" },
  { title: "Dolci", num: "10", src: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=800&fit=crop&q=80" },
];

const COUNT = GALLERY_ITEMS.length;
const INTRO_ACTIVE = 0;
const ACTIVE_SPAN = COUNT - 1;
const SPEED_DRAG = -0.3;

export default function PhotoGallery() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef = useRef(0);
  const startXRef = useRef(0);
  const isDownRef = useRef(false);
  const draggedRef = useRef(false);
  const rafRef = useRef(0);

  /* ── Direct DOM update — no React state, no re-renders ── */
  const applyLayout = useCallback(() => {
    progressRef.current = Math.max(0, Math.min(progressRef.current, 100));
    const active = INTRO_ACTIVE + (progressRef.current / 100) * ACTIVE_SPAN;

    for (let i = 0; i < COUNT; i++) {
      const card = cardRefs.current[i];
      const overlay = overlayRefs.current[i];
      if (!card) continue;

      const distance = i - active;
      const offset = distance / COUNT;
      const x = offset * 500;
      const y = offset * 120;
      const rot = offset * 80;
      const zi = Math.max(1, Math.round(COUNT - Math.abs(distance) * 2));
      const opacity = Math.max(0, Math.min(1, 1 - Math.max(0, Math.abs(distance) - 1.25) * 0.55));

      card.style.zIndex = String(zi);
      card.style.transform = `translate(${x}%, ${y}%) rotate(${rot}deg)`;
      if (overlay) overlay.style.opacity = String(opacity);
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

      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=100%",
        pin: true,
        pinSpacing: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          // Only scroll through first 3 cards (0→30% of total progress)
          progressRef.current = self.progress * 30;
          applyLayout();
        },
      });
    },
    { scope: sectionRef }
  );

  /* ── Pointer handlers (desktop drag) ── */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDownRef.current = true;
    draggedRef.current = false;
    startXRef.current = e.clientX;
    const el = carouselRef.current;
    if (el) el.style.cursor = "grabbing";
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
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

  const onPointerUp = useCallback(() => {
    isDownRef.current = false;
    const el = carouselRef.current;
    if (el) el.style.cursor = "grab";
  }, []);

  /* ── Touch handlers (mobile swipe) ── */
  const touchXRef = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchXRef.current = e.touches[0].clientX;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const x = e.touches[0].clientX;
      progressRef.current += (x - touchXRef.current) * SPEED_DRAG;
      touchXRef.current = x;
      scheduleUpdate();
    },
    [scheduleUpdate]
  );

  /* ── Card click ── */
  const onCardClick = useCallback(
    (i: number) => {
      if (draggedRef.current) return;
      progressRef.current = ((i - INTRO_ACTIVE) / ACTIVE_SPAN) * 100;
      applyLayout();
    },
    [applyLayout]
  );

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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-0.5 px-4 pt-2 text-center sm:pt-4 md:pt-6">
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
           `progressRef.current = self.progress * 30` and cause jitter /
           "jumping" on fast scrolls. Drag and touch are the only ways
           to scrub past the 3rd card — same UX, clean state. */}
      <div
        ref={carouselRef}
        className="relative h-full w-full"
        style={{ cursor: "grab", touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        {GALLERY_ITEMS.map((item, i) => (
          <div
            key={i}
            ref={(el) => { cardRefs.current[i] = el; }}
            className="absolute left-1/2 top-1/2 overflow-hidden rounded-xl will-change-transform"
            style={{
              width: "clamp(200px, 45vw, 300px)",
              height: "clamp(280px, 60vw, 400px)",
              marginTop: "calc(clamp(280px, 60vw, 400px) * -0.5)",
              marginLeft: "calc(clamp(200px, 45vw, 300px) * -0.5)",
              transformOrigin: "0% 100%",
              transition: "transform 0.8s cubic-bezier(0, 0.02, 0, 1)",
              boxShadow: "0 10px 50px 10px rgba(0,0,0,0.5)",
              background: "#0A192F",
              pointerEvents: "all",
              userSelect: "none",
            }}
            onClick={() => onCardClick(i)}
          >
            <div
              ref={(el) => { overlayRefs.current[i] = el; }}
              className="pointer-events-none absolute inset-0 z-10"
              style={{ transition: "opacity 0.8s cubic-bezier(0, 0.02, 0, 1)" }}
            >
              <div
                className="absolute inset-0 z-10"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.3), transparent 30%, transparent 50%, rgba(0,0,0,0.5))",
                }}
              />
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
              src={item.src}
              alt={item.title}
              className="pointer-events-none h-full w-full object-cover"
              draggable={false}
              loading="lazy"
            />
          </div>
        ))}
      </div>

      {/* Decorative side line — hidden on small screens to avoid overflow */}
      <div className="pointer-events-none absolute left-[90px] top-0 z-0 hidden h-full w-[10px] border-x border-white/15 sm:block" />

      {/* Bottom text — hidden on mobile to avoid clipping */}
      <div
        className="pointer-events-none absolute bottom-0 left-[30px] z-0 hidden origin-[0%_10%] -rotate-90 font-body text-[9px] uppercase leading-relaxed text-sand/40 sm:block"
      >
        Rena Bianca<br />Beach Bar & Restaurant<br />Sardynia, Włochy
      </div>

    </section>
  );
}
