"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import MenuBackgroundFloats from "./MenuBackgroundFloats";


/* ═══════════════════════════════════════════════════════════════
   INTERACTIVE BOOK MENU — Realistic page-fold effect
   ─────────────────────────────────────────────────────────────
   Exact math from the vanilla JS snippet:
   • constrainPoint with spine + diagonal circle constraints
   • Sutherland-Hodgman clipPolygon (line-based)
   • reflectPoint across fold line
   • Full-width flap with half-page content + oversized fold gradient
   • Corner-based drag detection (cornerThreshold)
   • Animated release with rAF cubic ease-out
   ═══════════════════════════════════════════════════════════════ */

/* ── Menu Data ── */
const bookData = [
  {
    id: "cover",
    title: "Rena Bianca",
    content: null,
    isCover: true,
  },
  {
    id: "antipasti",
    title: "Antipasti",
    content: [
      { name: "Bruschetta al Pomodoro", desc: "Grillowany chleb, dojrzałe pomidory, bazylia, oliwa extra vergine", price: "28 zł" },
      { name: "Carpaccio di Manzo", desc: "Cienkie plastry wołowiny, rukola, parmezan, kaparsy", price: "42 zł" },
      { name: "Burrata con Prosciutto", desc: "Kremowa burrata, prosciutto di Parma, grillowana brzoskwinia", price: "48 zł" },
      { name: "Tartare di Tonno", desc: "Tatar z tuńczyka, awokado, sezam, sos ponzu", price: "52 zł" },
      { name: "Calamari Fritti", desc: "Chrupiące kalmary, aioli cytrynowe", price: "36 zł" },
    ],
  },
  {
    id: "pasta",
    title: "Pasta",
    content: [
      { name: "Spaghetti alle Vongole", desc: "Małże, czosnek, białe wino, pietruszka", price: "58 zł" },
      { name: "Pappardelle al Ragù", desc: "Domowy makaron, wolno gotowany ragù z wołowiny", price: "52 zł" },
      { name: "Linguine al Pesto", desc: "Pesto genovese, orzeszki piniowe, pecorino", price: "44 zł" },
      { name: "Risotto ai Frutti di Mare", desc: "Owoce morza, szafran, białe wino", price: "68 zł" },
      { name: "Tagliatelle al Tartufo", desc: "Świeży makaron, masło truflowe, parmezan", price: "62 zł" },
    ],
  },
  {
    id: "pesce",
    title: "Pesce & Carne",
    content: [
      { name: "Branzino alla Griglia", desc: "Grillowany okoń morski, cytryna, zioła", price: "78 zł" },
      { name: "Tagliata di Manzo", desc: "Stek wołowy, rukola, pomidory, balsamico", price: "88 zł" },
      { name: "Gamberi alla Busara", desc: "Krewetki w sosie pomidorowym z białym winem", price: "72 zł" },
      { name: "Pollo alla Milanese", desc: "Panierowany kurczak, sałata, cytryna", price: "56 zł" },
    ],
  },
  {
    id: "dolci",
    title: "Dolci",
    content: [
      { name: "Tiramisù", desc: "Klasyczne tiramisù z mascarpone i espresso", price: "32 zł" },
      { name: "Panna Cotta", desc: "Waniliowa panna cotta, coulis z malin", price: "28 zł" },
      { name: "Affogato", desc: "Lody waniliowe, gorące espresso, amaretto", price: "26 zł" },
      { name: "Cannoli Siciliani", desc: "Chrupiące rurki, ricotta, pistacje, czekolada", price: "34 zł" },
    ],
  },
  {
    id: "bevande",
    title: "Bevande",
    content: [
      { name: "Aperol Spritz", desc: "Aperol, prosecco, woda gazowana, pomarańcza", price: "32 zł" },
      { name: "Negroni", desc: "Gin, Campari, vermut czerwony", price: "36 zł" },
      { name: "Limoncello Spritz", desc: "Limoncello, prosecco, mięta", price: "34 zł" },
      { name: "Hugo", desc: "Prosecco, syrop z bzu, mięta, limonka", price: "30 zł" },
      { name: "Espresso Martini", desc: "Wódka, espresso, likier kawowy", price: "38 zł" },
      { name: "Vino della Casa", desc: "Bianco / Rosso / Rosato — lampka", price: "28 zł" },
    ],
  },
  {
    id: "back",
    title: "Smacznego!",
    content: null,
    isBack: true,
  },
];

/* ── Exact geometry from vanilla JS ── */
type V2 = [number, number];

function clipPolygonByLine(points: V2[], a: number, b: number, c: number, keepInside: boolean): V2[] {
  const result: V2[] = [];
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const d1 = a * p1[0] + b * p1[1] + c;
    const d2 = a * p2[0] + b * p2[1] + c;
    const in1 = keepInside ? d1 <= 0 : d1 > 0;
    const in2 = keepInside ? d2 <= 0 : d2 > 0;
    if (in1) result.push(p1);
    if (in1 !== in2) {
      const t = d1 / (d1 - d2);
      result.push([p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])]);
    }
  }
  return result;
}

function reflectPoint(p: V2, a: number, b: number, c: number): V2 {
  const d = (a * p[0] + b * p[1] + c) / (a * a + b * b);
  return [p[0] - 2 * d * a, p[1] - 2 * d * b];
}

function toClipPath(points: V2[]): string {
  if (points.length === 0) return "polygon(0 0)";
  return "polygon(" + points.map((p) => `${p[0]}px ${p[1]}px`).join(", ") + ")";
}

interface BookState {
  width: number;
  height: number;
  pageWidth: number;
  spineX: number;
  diagonal: number;
  leftIndex: number;
  activeSide: "left" | "right" | null;
  activeCorner: V2 | null;
  isDragging: boolean;
}

function constrainPoint(mx: number, my: number, state: BookState): V2 {
  const { pageWidth, height, spineX, diagonal, activeCorner } = state;
  if (!activeCorner) return [mx, my];

  let x = mx, y = my;
  for (let i = 0; i < 3; i++) {
    // Distance to adjacent spine corner
    const c1x = spineX;
    const c1y = activeCorner[1];
    const dx1 = x - c1x;
    const dy1 = y - c1y;
    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    if (dist1 > pageWidth) {
      x = c1x + (dx1 / dist1) * pageWidth;
      y = c1y + (dy1 / dist1) * pageWidth;
    }

    // Distance to OPPOSITE spine corner
    const c2x = spineX;
    const c2y = activeCorner[1] === 0 ? height : 0;
    const dx2 = x - c2x;
    const dy2 = y - c2y;
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (dist2 > diagonal) {
      x = c2x + (dx2 / dist2) * diagonal;
      y = c2y + (dy2 / dist2) * diagonal;
    }
  }
  return [x, y];
}

/* ═══════════════════════════════════════════════════════════════ */

const CORNER_THRESHOLD = 100;

export default function InteractiveBookMenu() {
  const { t } = useI18n();
  const bookRef = useRef<HTMLDivElement>(null);
  const leftFrontRef = useRef<HTMLDivElement>(null);
  const rightFrontRef = useRef<HTMLDivElement>(null);
  const leftUnderRef = useRef<HTMLDivElement>(null);
  const rightUnderRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const flapContentRef = useRef<HTMLDivElement>(null);
  const foldGradientRef = useRef<HTMLDivElement>(null);

  const stateRef = useRef<BookState>({
    width: 0, height: 0, pageWidth: 0, spineX: 0, diagonal: 0,
    leftIndex: 0, activeSide: null, activeCorner: null, isDragging: false,
  });

  const [leftIndex, setLeftIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  /* `tocOpen` state is currently only written (e.g. closed on
     navigate) — the actual open/close visuals come from CSS. It's
     kept as a setter-only hook so the existing reset calls don't
     need a rewrite. */
  const [, setTocOpen] = useState(false);
  const [, forceRender] = useState(0);

  const totalPages = bookData.length;

  // Sync React state → ref
  useEffect(() => { stateRef.current.leftIndex = leftIndex; }, [leftIndex]);

  /* ── ResizeObserver ── */
  useEffect(() => {
    const book = bookRef.current;
    if (!book) return;
    const measure = () => {
      const rect = book.getBoundingClientRect();
      const s = stateRef.current;
      s.width = rect.width;
      s.height = rect.height;
      s.pageWidth = rect.width / 2;
      s.spineX = s.pageWidth;
      s.diagonal = Math.sqrt(s.pageWidth ** 2 + s.height ** 2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(book);
    return () => ro.disconnect();
  }, []);

  /* ── Render static pages ── */
  const getPage = useCallback((idx: number) => {
    if (idx < 0 || idx >= totalPages) return null;
    return bookData[idx];
  }, [totalPages]);

  /* ── updateFold — exact port from vanilla JS ── */
  const updateFold = useCallback((X: number, Y: number) => {
    const s = stateRef.current;
    if (!s.activeCorner) return;

    const { width, height, pageWidth, activeCorner } = s;
    const [mx, my] = constrainPoint(X, Y, s);

    const frontEl = s.activeSide === "right" ? rightFrontRef.current : leftFrontRef.current;
    const flap = flapRef.current;
    const flapContent = flapContentRef.current;
    const foldGrad = foldGradientRef.current;

    // Fold line: ax + by + c = 0 (perpendicular bisector of corner→drag)
    const a = activeCorner[0] - mx;
    const b = activeCorner[1] - my;
    const midx = (activeCorner[0] + mx) / 2;
    const midy = (activeCorner[1] + my) / 2;
    const c = -(a * midx + b * midy);

    let basePage: V2[];
    let p1_front: V2, p2_front: V2;
    let shiftX: number;

    if (s.activeSide === "right") {
      basePage = [[pageWidth, 0], [pageWidth, height], [width, height], [width, 0]];
      p1_front = [width, 0];
      p2_front = [pageWidth, 0];
      shiftX = pageWidth;
    } else {
      basePage = [[0, 0], [0, height], [pageWidth, height], [pageWidth, 0]];
      p1_front = [pageWidth, 0];
      p2_front = [0, 0];
      shiftX = 0;
    }

    // Clip front page (keep the side that stays)
    const frontPoints = clipPolygonByLine(basePage, a, b, c, true);
    const fpCSS: V2[] = frontPoints.map((p) => [p[0] - shiftX, p[1]]);
    if (frontEl) frontEl.style.clipPath = toClipPath(fpCSS);

    // Generate folded flap (reflect the "away" portion)
    const awayPoints = clipPolygonByLine(basePage, a, b, c, false);
    const flapPoints = awayPoints.map((p) => reflectPoint(p, a, b, c));
    if (flap) {
      flap.style.display = "block";
      flap.style.clipPath = toClipPath(flapPoints);
    }

    // Map flap content position via reflected corners
    const p1_flap = reflectPoint(p1_front, a, b, c);
    const p2_flap = reflectPoint(p2_front, a, b, c);
    const angleRot = Math.atan2(p2_flap[1] - p1_flap[1], p2_flap[0] - p1_flap[0]);

    if (flapContent) {
      flapContent.style.transformOrigin = "0 0";
      flapContent.style.transform = `translate(${p1_flap[0]}px, ${p1_flap[1]}px) rotate(${angleRot}rad)`;
    }

    // Position oversized fold gradient along the fold line
    const dxG = mx - activeCorner[0];
    const dyG = my - activeCorner[1];
    const angleG = Math.atan2(dyG, dxG);
    if (foldGrad) {
      foldGrad.style.display = "block";
      foldGrad.style.transform = `translate(${midx}px, ${midy}px) rotate(${angleG}rad)`;
      // Sine wave opacity: 0 at edges, peak in middle
      const progress = Math.abs(mx - activeCorner[0]) / width;
      foldGrad.style.opacity = Math.sin(progress * Math.PI).toFixed(3);
    }
  }, []);

  /* ── startDrag ── */
  const startDrag = useCallback((side: "left" | "right", corner: V2, x: number, y: number) => {
    const s = stateRef.current;
    s.activeSide = side;
    s.activeCorner = corner;
    s.isDragging = true;
    setIsDragging(true);

    if (flapRef.current) flapRef.current.style.display = "block";

    // Set under-page and flap content
    if (side === "right") {
      // Under-page shows what's 2 pages ahead on right
      // Flap shows back of current right page (= page leftIndex+2 content, displayed as left page)
    } else {
      // Under-page shows what's 2 pages back on left
      // Flap shows back of current left page (= page leftIndex-1 content, displayed as right page)
    }
    // Force re-render to update under/flap pages
    forceRender((c) => c + 1);

    updateFold(x, y);
  }, [updateFold]);

  /* ── Animated page flip (programmatic fold) ── */
  const animatingFlipRef = useRef(false);

  const animateFlip = useCallback((direction: "left" | "right") => {
    if (animatingFlipRef.current) return;
    const s = stateRef.current;
    const { width, height, leftIndex: li } = s;

    // Guard: can we flip in this direction?
    if (direction === "right" && li + 1 >= totalPages - 1) return;
    if (direction === "left" && li <= 0) return;

    animatingFlipRef.current = true;

    // Pick bottom corner as the fold origin
    const corner: V2 = direction === "right" ? [width, height] : [0, height];
    startDrag(direction, corner, corner[0], corner[1]);

    // Phase 1: animate from corner to past the spine
    const fromX = corner[0];
    const toX = direction === "right" ? -width * 0.15 : width * 1.15;
    const fromY = height * 0.85;
    const toY = height * 0.6;
    const startTime = performance.now();
    const FOLD_DUR = 450;

    const animateFold = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / FOLD_DUR, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const cx = fromX + (toX - fromX) * ease;
      const cy = fromY + (toY - fromY) * ease;
      updateFold(cx, cy);

      if (t < 1) {
        requestAnimationFrame(animateFold);
      } else {
        // Phase 2: release — snap to completion
        s.isDragging = false;
        setIsDragging(false);

        const targetX = direction === "right" ? 0 : width;
        const releaseStart = performance.now();

        const animateRelease = (time2: number) => {
          const p = Math.min((time2 - releaseStart) / 200, 1);
          const easeOut = 1 - Math.pow(1 - p, 3);
          updateFold(
            cx + (targetX - cx) * easeOut,
            cy + (corner[1] - cy) * easeOut
          );

          if (p < 1) {
            requestAnimationFrame(animateRelease);
          } else {
            if (flapRef.current) flapRef.current.style.display = "none";
            if (foldGradientRef.current) foldGradientRef.current.style.display = "none";
            const frontEl = direction === "right" ? rightFrontRef.current : leftFrontRef.current;
            if (frontEl) frontEl.style.clipPath = "none";

            setLeftIndex((prev) => {
              return direction === "right"
                ? Math.min(prev + 2, totalPages - 2)
                : Math.max(prev - 2, 0);
            });
            s.activeSide = null;
            s.activeCorner = null;
            animatingFlipRef.current = false;
          }
        };
        requestAnimationFrame(animateRelease);
      }
    };
    requestAnimationFrame(animateFold);
  }, [totalPages, startDrag, updateFold]);

  /* ── Popup carousel state (must be before pointer handlers) ── */
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupIdx, setPopupIdx] = useState(0);
  const contentPages = bookData.filter((p) => !p.isCover && !p.isBack);

  const openPopup = useCallback((pageId: string) => {
    const idx = contentPages.findIndex((p) => p.id === pageId);
    setPopupIdx(idx >= 0 ? idx : 0);
    setPopupOpen(true);
  }, [contentPages]);

  const closePopup = useCallback(() => setPopupOpen(false), []);

  /* ── Pointer handlers ── */
  const pointerStartRef = useRef<{ x: number; y: number; dragged: boolean } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const book = bookRef.current;
    if (!book) return;
    const rect = book.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const s = stateRef.current;
    const { width, height, leftIndex: li } = s;
    const TH = Math.min(CORNER_THRESHOLD, width * 0.15);

    pointerStartRef.current = { x: e.clientX, y: e.clientY, dragged: false };
    book.setPointerCapture(e.pointerId);

    // Right page corners (can turn forward)
    if (li + 1 < totalPages - 1) {
      if (x > width - TH && y < TH) { pointerStartRef.current.dragged = true; return startDrag("right", [width, 0], x, y); }
      if (x > width - TH && y > height - TH) { pointerStartRef.current.dragged = true; return startDrag("right", [width, height], x, y); }
    }
    // Left page corners (can turn backward)
    if (li > 0) {
      if (x < TH && y < TH) { pointerStartRef.current.dragged = true; return startDrag("left", [0, 0], x, y); }
      if (x < TH && y > height - TH) { pointerStartRef.current.dragged = true; return startDrag("left", [0, height], x, y); }
    }
  }, [totalPages, startDrag]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!stateRef.current.isDragging) return;
    if (pointerStartRef.current) pointerStartRef.current.dragged = true;
    const book = bookRef.current;
    if (!book) return;
    const rect = book.getBoundingClientRect();
    updateFold(e.clientX - rect.left, e.clientY - rect.top);
  }, [updateFold]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current;
    const ps = pointerStartRef.current;

    // Click detection: no drag occurred → flip page in the tapped direction
    if (ps && !ps.dragged && !s.isDragging) {
      const book = bookRef.current;
      if (book) {
        book.releasePointerCapture(e.pointerId);
        const rect = book.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        if (localX > rect.width / 2) animateFlip("right");
        else animateFlip("left");
      }
      pointerStartRef.current = null;
      return;
    }
    pointerStartRef.current = null;

    if (!s.isDragging) return;
    s.isDragging = false;
    setIsDragging(false);

    const book = bookRef.current;
    if (book) book.releasePointerCapture(e.pointerId);
    if (!book || !s.activeCorner) { s.activeSide = null; return; }

    const rect = book.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { width, activeSide } = s;

    // Did we drag past the spine?
    const isComplete = (activeSide === "right" && x < width / 2 + 100)
      || (activeSide === "left" && x > width / 2 - 100);

    const targetX = isComplete
      ? (activeSide === "right" ? 0 : width)
      : s.activeCorner[0];
    const targetY = s.activeCorner[1];

    const startX = x, startY = y;
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / 300, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out

      updateFold(
        startX + (targetX - startX) * ease,
        startY + (targetY - startY) * ease
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Done: reset visuals
        if (flapRef.current) flapRef.current.style.display = "none";
        if (foldGradientRef.current) foldGradientRef.current.style.display = "none";
        const frontEl = activeSide === "right" ? rightFrontRef.current : leftFrontRef.current;
        if (frontEl) frontEl.style.clipPath = "none";

        if (isComplete) {
          setLeftIndex((prev) => {
            const next = activeSide === "right"
              ? Math.min(prev + 2, totalPages - 2)
              : Math.max(prev - 2, 0);
            return next;
          });
        }
        s.activeSide = null;
        s.activeCorner = null;
      }
    };
    requestAnimationFrame(animate);
  }, [totalPages, updateFold, animateFlip]);

  /* ── Navigate (TOC / arrows) ── */
  const goToPage = useCallback((pageIndex: number) => {
    const target = pageIndex % 2 === 0 ? pageIndex : pageIndex - 1;
    setLeftIndex(Math.max(0, Math.min(target, totalPages - 2)));
    setTocOpen(false);
  }, [totalPages]);

  const goNext = useCallback(() => {
    animateFlip("right");
  }, [animateFlip]);

  const goPrev = useCallback(() => {
    animateFlip("left");
  }, [animateFlip]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  // #region agent log
  useEffect(() => {
    const send = () => {
      const sect = document.querySelector('[data-menu-section]') as HTMLElement | null;
      const book = document.querySelector('[data-menu-section] [data-book-stage]') as HTMLElement | null;
      const buttons = document.querySelectorAll('[data-menu-section] [data-menu-cta]');
      const lastBtn = buttons[buttons.length - 1] as HTMLElement | null;
      if (!sect) return;
      const sr = sect.getBoundingClientRect();
      const br = book?.getBoundingClientRect();
      const cr = lastBtn?.getBoundingClientRect();
      fetch('http://127.0.0.1:7448/ingest/e851fae5-0f43-4007-a667-b05ec1b0c1b7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '5e042f' },
        body: JSON.stringify({
          sessionId: '5e042f',
          runId: 'run1',
          hypothesisId: 'H2',
          location: 'InteractiveBookMenu.tsx:mount',
          message: 'menu stack measure',
          data: {
            vw: window.innerWidth,
            vh: window.innerHeight,
            dvh: window.visualViewport?.height ?? null,
            section: sr ? { h: Math.round(sr.height), scrollH: sect.scrollHeight } : null,
            book: br ? { top: Math.round(br.top), h: Math.round(br.height) } : null,
            lastCtaBottom: cr ? Math.round(cr.bottom) : null,
            ctaCount: buttons.length,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    };
    // Wait a frame for layout to settle
    const t = window.setTimeout(send, 400);
    return () => window.clearTimeout(t);
  }, []);
  // #endregion

  /* ── Derived data ── */
  const leftPage = getPage(leftIndex);
  const rightPage = getPage(leftIndex + 1);
  const activeSide = stateRef.current.activeSide;
  const flapPageIdx = activeSide === "right" ? leftIndex + 2 : leftIndex - 1;
  const underLeftIdx = leftIndex - 1;
  const underRightIdx = leftIndex + 2;

  const canGoLeft = leftIndex > 0;
  const canGoRight = leftIndex + 2 < totalPages;

  /* Popup state moved above pointer handlers */

  return (
    <section
      id="menu"
      data-menu-section
      className="relative flex min-h-dvh flex-col pt-2 pb-4 sm:pt-3 sm:pb-6 md:pt-5 md:pb-10"
      style={{ background: "linear-gradient(180deg, #0A192F 0%, #0d2240 50%, #0A192F 100%)" }}
    >
      {/* ── Animated beach decorations — idle float + scroll parallax.
            Easily swap SVGs for PNGs inside MenuBackgroundFloats. ── */}
      <MenuBackgroundFloats />

      {/* Section heading — kept compact so the book fills more of the
          viewport and the user sees noticeably more of the menu cards
          before they even scroll. */}
      <div className="relative z-10 mx-auto mb-1 max-w-7xl px-4 text-center sm:mb-2 sm:px-6 md:mb-3">
        <span className="mb-0.5 block font-body text-[10px] uppercase tracking-[0.3em] text-sand/50 sm:mb-1 sm:text-xs">
          {t("menu.subheading")}
        </span>
        <h2 className="font-heading text-2xl text-sand sm:text-4xl md:text-5xl" style={{ fontWeight: 400 }}>
          {t("menu.heading")}
        </h2>
        <div className="mx-auto mt-2 h-px w-24 sm:mt-2 sm:w-36 md:w-48" style={{ background: "linear-gradient(90deg, transparent, rgba(253,251,247,0.45), transparent)" }} />
      </div>

      <div className="relative z-10 mx-auto flex w-full flex-1 max-w-[1500px] items-start justify-center gap-4 px-3 pb-6 sm:gap-8 sm:px-4 md:px-6">
        {/* ═══ TOC Sidebar ═══ */}
        <aside className="hidden w-56 shrink-0 xl:block">
          <nav className="sticky top-28 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <h3 className="mb-4 font-heading text-lg text-sand/80" style={{ fontWeight: 500 }}>
              {t("nav.menu")}
            </h3>
            <ul className="space-y-1">
              {bookData.map((page, i) => (
                <li key={page.id}>
                  <button
                    onClick={() => goToPage(i)}
                    className={`w-full rounded-lg px-3 py-2 text-left font-body text-sm transition-all duration-300
                      ${leftIndex === i || leftIndex + 1 === i
                        ? "bg-ocean/20 text-sand font-medium"
                        : "text-sand/50 hover:bg-white/5 hover:text-sand/80"
                      }`}
                  >
                    <span className="mr-2 font-body text-xs text-sand/30">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {page.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* ═══ BOOK + Mobile TOC ═══ */}
        <div className="flex w-full max-w-[1220px] flex-col items-center">
          {/* ── Mobile TOC — horizontal pills above book. Tight bottom
                margin so the book card sits as high as possible and
                more of the menu surface shows in the viewport. ── */}
          <div className="mb-1 w-full overflow-x-auto scrollbar-none sm:mb-2 xl:hidden">
            <div className="flex items-center gap-2 px-1 pb-2">
              {bookData.filter(p => !p.isCover && !(p as { isBack?: boolean }).isBack).map((page) => {
                const pageIdx = bookData.indexOf(page);
                const isActive = leftIndex === pageIdx || leftIndex + 1 === pageIdx;
                return (
                  <button
                    key={page.id}
                    onClick={() => goToPage(pageIdx)}
                    className={`shrink-0 rounded-full px-4 py-2 font-body text-xs transition-all duration-300 whitespace-nowrap
                      ${isActive
                        ? "bg-ocean/30 text-sand border border-ocean/40"
                        : "bg-white/5 text-sand/50 border border-white/10 hover:bg-white/10 hover:text-sand/80"}`}
                  >
                    {page.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── How-to-flip tip — sits in the normal flow ABOVE the
                book and BELOW the TOC pills so it never overlaps
                either of them on any viewport. Right-aligned on
                ≥ md so it visually anchors to the right page edge,
                centred on phones where vertical room is tight. ── */}
          <div className="mb-2 flex w-full items-center justify-center px-2 sm:mb-2 md:justify-end md:pr-1">
            <div
              className="pointer-events-none inline-flex max-w-full items-center gap-1.5 whitespace-normal rounded-full border border-white/10 bg-navy/45 px-3 py-1 text-center font-body text-[10px] leading-tight text-sand/65 backdrop-blur-sm sm:gap-2 sm:whitespace-nowrap sm:px-4 sm:py-1.5 sm:text-[11px] sm:uppercase sm:tracking-[0.18em]"
              aria-hidden
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" className="shrink-0 opacity-70 sm:h-3 sm:w-3">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{t("menu.flipTip")}</span>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" className="shrink-0 opacity-70 sm:h-3 sm:w-3">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div data-book-stage className="relative z-10 w-full" style={{ aspectRatio: "2 / 1.3", minHeight: "clamp(420px, 64vw, 880px)" }}>
            {/* ── Side arrows — clickable page-turn affordance.
                  Hidden on small screens (they overlap the book
                  there); the bottom-nav arrows handle mobile. On
                  md+ they float left/right of the book. ── */}
            <button
              onClick={goPrev}
              disabled={!canGoLeft}
              aria-label={t("menu.prevPage") || "Poprzednia strona"}
              className={`group/arrow absolute left-0 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 md:flex md:h-14 md:w-14 md:-translate-x-[120%]
                ${canGoLeft
                  ? "border-white/30 bg-white/10 text-sand hover:scale-110 hover:border-sand hover:bg-white/20 hover:text-white active:scale-95"
                  : "cursor-not-allowed border-white/5 bg-white/5 text-sand/15"}`}
              style={{
                boxShadow: canGoLeft
                  ? "0 10px 30px -8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)"
                  : undefined,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="sm:h-6 sm:w-6">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap font-body text-[10px] uppercase tracking-[0.2em] text-sand/60 opacity-0 transition-opacity duration-300 group-hover/arrow:opacity-100 lg:block">
                {t("menu.prevPage") || "Poprzednia"}
              </span>
            </button>

            <button
              onClick={goNext}
              disabled={!canGoRight}
              aria-label={t("menu.nextPage") || "Następna strona"}
              className={`group/arrow absolute right-0 top-1/2 z-30 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 md:flex md:h-14 md:w-14 md:translate-x-[120%]
                ${canGoRight
                  ? "border-white/30 bg-white/10 text-sand hover:scale-110 hover:border-sand hover:bg-white/20 hover:text-white active:scale-95 animate-pulse-gentle"
                  : "cursor-not-allowed border-white/5 bg-white/5 text-sand/15"}`}
              style={{
                boxShadow: canGoRight
                  ? "0 10px 30px -8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)"
                  : undefined,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="sm:h-6 sm:w-6">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap font-body text-[10px] uppercase tracking-[0.2em] text-sand/60 opacity-0 transition-opacity duration-300 group-hover/arrow:opacity-100 lg:block">
                {t("menu.nextPage") || "Następna"}
              </span>
            </button>

            <div
              ref={bookRef}
              className="relative h-full w-full select-none overflow-visible rounded-lg bg-[#f0f0f0] shadow-2xl"
              style={{
                cursor: isDragging ? "grabbing" : "grab",
                touchAction: "none",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* ── Under pages (revealed when front page folds away) ── */}
              <div ref={leftUnderRef} className="absolute left-0 top-0 h-full w-1/2"
                style={{ backgroundImage: "linear-gradient(to left, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 8%)" }}>
                <PageView page={getPage(activeSide === "left" ? underLeftIdx : leftIndex)} side="left" />
              </div>
              <div ref={rightUnderRef} className="absolute left-1/2 top-0 h-full w-1/2 border-l border-[#ddd]"
                style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 8%)" }}>
                <PageView page={getPage(activeSide === "right" ? underRightIdx : leftIndex + 1)} side="right" />
              </div>

              {/* ── Front pages (z-2, clipped during fold) ── */}
              <div
                ref={leftFrontRef}
                className="absolute left-0 top-0 z-2 h-full w-1/2"
                style={{ backgroundImage: "linear-gradient(to left, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 8%)" }}
              >
                <PageView page={leftPage} side="left" onExpand={openPopup} />
              </div>
              <div
                ref={rightFrontRef}
                className="absolute left-1/2 top-0 z-2 h-full w-1/2 border-l border-[#ddd]"
                style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 8%)" }}
              >
                <PageView page={rightPage} side="right" onExpand={openPopup} />
              </div>

              {/* ── FLAP (z-5, full book width, clip-path applied) ── */}
              <div
                ref={flapRef}
                className="pointer-events-none absolute left-0 top-0 z-5 h-full w-full"
                style={{ display: "none", filter: "drop-shadow(0px 0px 10px rgba(0,0,0,0.4))" }}
              >
                {/* Flap content — half-page width, positioned with transform */}
                <div
                  ref={flapContentRef}
                  className="absolute left-0 top-0 h-full bg-[#fdfdfd]"
                  style={{ width: "50%" }}
                >
                  <PageView
                    page={getPage(flapPageIdx)}
                    side={activeSide === "right" ? "left" : "right"}
                    isFlap
                  />
                </div>

                {/* Fold gradient — oversized, tracks fold line */}
                <div
                  ref={foldGradientRef}
                  className="pointer-events-none absolute"
                  style={{
                    display: "none",
                    width: "300%",
                    height: "300%",
                    left: "-150%",
                    top: "-150%",
                    background: `linear-gradient(to right,
                      transparent 49.5%,
                      rgba(0,0,0,0.3) 50%,
                      rgba(255,255,255,0.7) 51.5%,
                      rgba(0,0,0,0.05) 58%,
                      transparent 65%
                    )`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Navigation controls — arrows are HIDDEN on phones
                (touch users tap the page or swipe a corner; the
                top-right hint tells them so). The page counter
                stays visible on every viewport. ── */}
          <div className="mt-3 flex items-center gap-4 sm:mt-6 sm:gap-6">
            <button
              onClick={goPrev}
              disabled={!canGoLeft}
              className={`hidden h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 sm:flex
                ${canGoLeft
                  ? "border-sand/30 text-sand/70 hover:border-sand/60 hover:text-sand"
                  : "border-sand/10 text-sand/20 cursor-not-allowed"}`}
              aria-label={t("menu.prevPage")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="font-body text-xs tabular-nums text-sand/40 tracking-wider">
              {String(leftIndex + 1).padStart(2, "0")}–{String(Math.min(leftIndex + 2, totalPages)).padStart(2, "0")}
              {" / "}{String(totalPages).padStart(2, "0")}
            </span>
            <button
              onClick={goNext}
              disabled={!canGoRight}
              className={`hidden h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 sm:flex
                ${canGoRight
                  ? "border-sand/30 text-sand/70 hover:border-sand/60 hover:text-sand"
                  : "border-sand/10 text-sand/20 cursor-not-allowed"}`}
              aria-label={t("menu.nextPage")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="mt-2 px-4 text-center font-body text-[10px] text-sand/35 sm:mt-3 sm:text-xs">
            {t("menu.hint")}
          </p>
          <a
            data-menu-cta="reservation"
            href="#reservation"
            onClick={(e) => {
              e.preventDefault();
              const target = document.querySelector("#reservation");
              if (!target) return;
              const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number | string | HTMLElement, o?: { duration?: number; offset?: number }) => void } }).__lenis;
              if (lenis && typeof lenis.scrollTo === "function") {
                lenis.scrollTo(target as HTMLElement, { duration: 1.4, offset: -40 });
              } else {
                (target as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="group/menu-btn relative mt-4 flex h-12 w-56 items-center justify-center overflow-hidden rounded-md border border-sand/20 bg-white/5 text-sand shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-colors duration-300 hover:border-sand/40 hover:bg-white/10"
          >
            <span className="font-body text-xs font-medium uppercase tracking-[0.3em] transition-transform duration-500 group-hover/menu-btn:translate-x-56 sm:text-sm">
              {t("nav.reservation")}
            </span>
            <span className="absolute inset-0 flex items-center justify-center -translate-x-56 font-body text-xs font-medium uppercase tracking-[0.3em] transition-transform duration-500 group-hover/menu-btn:translate-x-0 sm:text-sm">
              {t("nav.reservation")}
            </span>
          </a>

          {/* ── Mobile CTA: prominent button to open readable popup ── */}
          <button
            data-menu-cta="open-popup"
            onClick={() => {
              const page = contentPages.find((_, i) => {
                const idx = bookData.indexOf(contentPages[i]);
                return idx === leftIndex || idx === leftIndex + 1;
              });
              openPopup(page?.id ?? contentPages[0]?.id ?? "antipasti");
            }}
            className="mt-3 flex items-center gap-2 rounded-full border border-ocean/40 bg-ocean/20 px-6 py-2.5 font-body text-sm font-medium tracking-wide text-sand backdrop-blur-sm transition-all duration-300 hover:border-ocean/60 hover:bg-ocean/30 sm:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("menu.openBtn")}
          </button>
        </div>
      </div>

      {/* ═══ POPUP CAROUSEL — swipeable cards ═══ */}
      {popupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={closePopup}
        >
          {/* Close button */}
          <button
            onClick={closePopup}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 md:right-8 md:top-8"
            aria-label="Zamknij"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Category label */}
          <div className="absolute left-0 right-0 top-16 z-10 text-center md:top-8">
            <span className="font-body text-xs uppercase tracking-[0.3em] text-white/40">
              {contentPages[popupIdx]?.title}
            </span>
            <span className="ml-3 font-body text-xs text-white/30">
              {popupIdx + 1} / {contentPages.length}
            </span>
          </div>

          {/* Prev arrow — desktop */}
          {popupIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setPopupIdx((p) => p - 1); }}
              className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition-colors hover:bg-white/20 sm:flex md:left-8"
              aria-label="Poprzednia"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Swipeable card container */}
          <div
            className="mx-4 w-full max-w-lg sm:mx-14 md:mx-20"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              const t = e.touches[0];
              const el = e.currentTarget as HTMLDivElement & { _swipeX?: number | null; _swipeY?: number | null };
              el._swipeX = t.clientX;
              el._swipeY = t.clientY;
            }}
            onTouchEnd={(e) => {
              const el = e.currentTarget as HTMLDivElement & { _swipeX?: number | null; _swipeY?: number | null };
              const startX = el._swipeX;
              const startY = el._swipeY;
              if (startX == null || startY == null) return;
              const endX = e.changedTouches[0].clientX;
              const endY = e.changedTouches[0].clientY;
              const dx = endX - startX;
              const dy = Math.abs(endY - startY);
              if (Math.abs(dx) > 50 && dy < 100) {
                if (dx < 0 && popupIdx < contentPages.length - 1) setPopupIdx((p) => p + 1);
                if (dx > 0 && popupIdx > 0) setPopupIdx((p) => p - 1);
              }
              el._swipeX = null;
              el._swipeY = null;
            }}
          >
            {/* Card content */}
            <div className="max-h-[75vh] overflow-y-auto overscroll-contain rounded-2xl bg-[#FAFAFA] p-5 shadow-2xl sm:p-6 md:p-10">
              {(() => {
                const page = contentPages[popupIdx];
                if (!page) return null;
                return (
                  <>
                    <h3 className="mb-4 font-heading text-xl text-navy sm:text-2xl md:text-3xl" style={{ fontWeight: 500, letterSpacing: "0.02em" }}>
                      {page.title}
                    </h3>
                    <div className="flex flex-col gap-3 sm:gap-4">
                      {page.content?.map((item, i) => (
                        <div key={i} className="border-b border-navy/10 pb-3 last:border-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="font-heading text-sm font-medium text-navy sm:text-base md:text-lg">
                              {item.name}
                            </h4>
                            <span className="shrink-0 font-body text-sm font-medium text-ocean sm:text-base">
                              {item.price}
                            </span>
                          </div>
                          <p className="mt-1 font-body text-xs text-navy/50 sm:text-sm">
                            {item.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Dot indicators + swipe hint */}
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                {contentPages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPopupIdx(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${popupIdx === i ? "w-6 bg-ocean" : "w-2 bg-white/20 hover:bg-white/40"}`}
                  />
                ))}
              </div>
              <span className="font-body text-xs text-white/30 sm:hidden">
                ← Przesuń aby zmienić →
              </span>
            </div>
          </div>

          {/* Next arrow — desktop */}
          {popupIdx < contentPages.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setPopupIdx((p) => p + 1); }}
              className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition-colors hover:bg-white/20 sm:flex md:right-8"
              aria-label="Następna"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      )}
      {/* ── Decorative wave at bottom of menu ── */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-px z-30">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="block w-full" style={{ height: "clamp(60px, 10vw, 130px)" }}>
          <path
            d="M0,60 C180,100 360,20 540,65 C720,110 900,25 1080,70 C1200,95 1350,35 1440,55 L1440,120 L0,120Z"
            fill="rgba(59,130,196,0.15)"
          />
          <path
            d="M0,75 C200,110 400,40 600,80 C800,115 1000,40 1200,75 C1340,100 1400,55 1440,70 L1440,120 L0,120Z"
            fill="rgba(59,130,196,0.25)"
          />
          <path
            d="M0,90 C240,120 480,70 720,95 C960,120 1200,75 1440,90 L1440,120 L0,120Z"
            fill="rgba(26,74,110,0.6)"
          />
          <path
            d="M0,105 C300,118 600,95 900,110 C1100,118 1300,100 1440,108 L1440,120 L0,120Z"
            fill="#0A192F"
          />
        </svg>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE VIEW — renders a single page's content
   ═══════════════════════════════════════════════════════════════ */

/** Shared "eye" glyph — used by the inline preview button next
 *  to a page's title and the corner fallback on cover/back pages. */
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[58%] w-[58%]">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

interface PageData {
  id: string;
  title: string;
  content: { name: string; desc: string; price: string }[] | null;
  isCover?: boolean;
  isBack?: boolean;
}

function PageView({
  page,
  /* `side` is part of the layout contract that callers pass in;
     it isn't read in the view itself yet but is kept for future
     left/right-specific styling without having to rewire every
     call site. The `_side` rename silences no-unused-vars while
     preserving the external prop name. */
  side: _side,
  isFlap = false,
  onExpand,
}: {
  page: PageData | null;
  side: "left" | "right";
  isFlap?: boolean;
  onExpand?: (pageId: string) => void;
}) {
  if (!page) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ background: "#FAFAFA" }}
      />
    );
  }

  // Cover page — no eye-icon (it's just the book cover, nothing to expand)
  if (page.isCover) {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-center p-6"
        style={{
          background: "linear-gradient(145deg, #0A192F 0%, #1a3a5c 50%, #2a6a9e 100%)",
        }}
      >
        <div className="flex flex-col items-center gap-3 text-center md:gap-5">
          <div
            className="mb-1 h-px w-12 md:w-16"
            style={{ background: "linear-gradient(90deg, transparent, #FDFBF7, transparent)" }}
          />
          <img
            src="/logo.svg"
            alt="Rena Bianca"
            className="w-24 md:w-40 h-auto drop-shadow-lg"
            draggable={false}
          />
          <div
            className="mt-1 h-px w-12 md:w-16"
            style={{ background: "linear-gradient(90deg, transparent, #FDFBF7, transparent)" }}
          />
          <p
            className="mt-2 font-body text-sand/40"
            style={{ fontSize: "clamp(0.45rem, 0.8vw, 0.65rem)", letterSpacing: "0.15em" }}
          >
            MENU 2026
          </p>
        </div>
      </div>
    );
  }

  // Back cover — no eye-icon (closing page, no content to preview)
  if (page.isBack) {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-center p-6"
        style={{
          background: "linear-gradient(145deg, #0A192F 0%, #1a3a5c 100%)",
        }}
      >
        <p
          className="font-heading text-sand/60"
          style={{ fontSize: "clamp(1rem, 2.5vw, 2rem)", fontWeight: 400 }}
        >
          Smacznego!
        </p>
        <p
          className="mt-3 font-body text-sand/30"
          style={{ fontSize: "clamp(0.45rem, 0.7vw, 0.6rem)", letterSpacing: "0.2em" }}
        >
          RENA BIANCA • 2026
        </p>
      </div>
    );
  }

  // Content pages
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: isFlap
          ? "linear-gradient(135deg, #f5f0e8 0%, #FAFAFA 100%)"
          : "#FAFAFA",
        padding: "clamp(14px, 2.8vw, 36px)",
      }}
    >
      {/* Page header — title on the left, eye-icon preview button
           right next to it on the right side of the title row.
           Tapping the eye opens the full-screen readable popup —
           much easier than squinting at the tilted book page on
           mobile or peering at a small card on desktop. */}
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-navy/10 pb-2 md:mb-3 md:pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3
            className="min-w-0 truncate font-heading text-navy"
            style={{
              fontSize: "clamp(1.05rem, 2.6vw, 2.15rem)",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            {page.title}
          </h3>
          {onExpand && !isFlap && (
            <button
              onClick={(e) => { e.stopPropagation(); onExpand(page.id); }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Otwórz czytelny podgląd tego rozdziału"
              title="Otwórz podgląd"
              className="pointer-events-auto flex shrink-0 items-center justify-center rounded-full border border-navy/15 bg-white/80 text-navy/60 backdrop-blur-sm transition-all duration-300 hover:border-ocean/40 hover:bg-white hover:text-ocean hover:shadow-[0_4px_14px_rgba(59,130,196,0.25)]"
              style={{
                width: "clamp(28px, 2.8vw, 36px)",
                height: "clamp(28px, 2.8vw, 36px)",
              }}
            >
              <EyeIcon />
            </button>
          )}
        </div>
        <span
          className="shrink-0 font-body text-navy/20"
          style={{ fontSize: "clamp(0.4rem, 0.7vw, 0.6rem)", letterSpacing: "0.15em" }}
        >
          RENA BIANCA
        </span>
      </div>

      {/* Menu items */}
      <div className="flex flex-1 flex-col justify-start gap-1 overflow-hidden md:gap-2">
        {page.content?.map((item, i) => (
          <div key={i} className="group">
            <div className="flex items-baseline justify-between gap-2">
              <h4
                className="font-heading text-navy"
                style={{
                  fontSize: "clamp(0.8rem, 1.6vw, 1.2rem)",
                  fontWeight: 500,
                }}
              >
                {item.name}
              </h4>
              <div className="mx-1 min-w-4 flex-1 border-b border-dotted border-navy/15" />
              <span
                className="shrink-0 font-body font-medium text-ocean"
                style={{ fontSize: "clamp(0.75rem, 1.35vw, 1.02rem)" }}
              >
                {item.price}
              </span>
            </div>
            <p
              className="font-body text-navy/45 leading-snug"
              style={{ fontSize: "clamp(0.6rem, 1.15vw, 0.84rem)" }}
            >
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Page number */}
      <div className="mt-auto pt-1 text-center md:pt-2">
        <span
          className="font-body text-navy/20"
          style={{ fontSize: "clamp(0.4rem, 0.6vw, 0.5rem)" }}
        >
          — {page.id} —
        </span>
      </div>
    </div>
  );
}
