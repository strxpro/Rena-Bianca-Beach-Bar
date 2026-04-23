"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* ── Global ScrollTrigger defaults ──────────────────────────────
      These apply to EVERY ScrollTrigger created anywhere in the
      app, so the individual components don't each have to opt-in.
      Key knobs:
        • `ignoreMobileResize: true` — mobile Safari + Chrome fire
          a synthetic resize on every URL-bar show/hide; without
          this the pinned sections get re-measured mid-scroll
          and the pin jumps.
        • `limitCallbacks: true` — only fires onEnter/onLeave etc.
          once the scroll actually crosses the boundary, never in
          the same frame an onUpdate was already handling. This is
          the single biggest fix for the "fast scroll skips a
          section" bug the user reported on phones.
   ── */
if (typeof window !== "undefined") {
  ScrollTrigger.config({
    ignoreMobileResize: true,
    limitCallbacks: true,
  });

}

export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);

  /* ── Always start from top on refresh ── */
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const isMobile =
      typeof window !== "undefined" && window.innerWidth < 768;
    const prefersReducedMotion = typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hardwareThreads = typeof navigator !== "undefined" ? navigator.hardwareConcurrency : undefined;
    const lowPowerDevice = prefersReducedMotion || (typeof hardwareThreads === "number" && hardwareThreads <= 4);

    /* Track scroll direction so the prevent callback can decide
       whether to pass through at scroll-container bounds.
       -1 = scrolling UP, +1 = scrolling DOWN, 0 = unknown */
    let scrollDir = 0;
    let lastTouchY = 0;
    const onWheelDir = (e: WheelEvent) => { scrollDir = e.deltaY > 0 ? 1 : -1; };
    const onTouchStartDir = (e: TouchEvent) => { lastTouchY = e.touches[0].clientY; scrollDir = 0; };
    const onTouchMoveDir = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      scrollDir = y < lastTouchY ? 1 : -1; // finger moves up → scroll down
      lastTouchY = y;
    };
    window.addEventListener("wheel", onWheelDir, { passive: true });
    window.addEventListener("touchstart", onTouchStartDir, { passive: true });
    window.addEventListener("touchmove", onTouchMoveDir, { passive: true });

    /* ── MOBILE / LOW-POWER: skip Lenis, use native scroll ─────
          The backup proved that native scroll + ScrollTrigger.update
          on the window scroll event is the most reliable approach
          on phones. Lenis syncTouch changes touch physics and causes
          pinned sections to skip under fast swipes. ── */
    if (isMobile || lowPowerDevice) {
      document.documentElement.classList.add("intro-locked");
      document.body.classList.add("intro-locked");
      const releaseLock = () => {
        document.documentElement.classList.remove("intro-locked");
        document.body.classList.remove("intro-locked");
        requestAnimationFrame(() => ScrollTrigger.refresh());
      };
      window.addEventListener("video-ended", releaseLock, { once: true });
      const safetyUnlock = window.setTimeout(releaseLock, 12000);

      let rafId = 0;
      let resizeTimer = 0;
      const onResize = () => {
        cancelAnimationFrame(rafId);
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          rafId = requestAnimationFrame(() => {
            ScrollTrigger.refresh();
          });
        }, 250);
      };
      window.addEventListener("resize", onResize);
      window.addEventListener("orientationchange", onResize);

      if (typeof document !== "undefined" && document.fonts?.ready) {
        document.fonts.ready.then(() => {
          requestAnimationFrame(() => ScrollTrigger.refresh());
        });
      }

      return () => {
        window.removeEventListener("wheel", onWheelDir);
        window.removeEventListener("touchstart", onTouchStartDir);
        window.removeEventListener("touchmove", onTouchMoveDir);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onResize);
        window.removeEventListener("video-ended", releaseLock);
        window.clearTimeout(safetyUnlock);
        cancelAnimationFrame(rafId);
        clearTimeout(resizeTimer);
        document.documentElement.classList.remove("intro-locked");
        document.body.classList.remove("intro-locked");
      };
    }

    /* ── DESKTOP: full Lenis smooth scroll ── */
    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.7,
      wheelMultiplier: 1,
      infinite: false,
      prevent: (node) => {
        const element = node instanceof Element
          ? node
          : (node as Node | null)?.parentElement ?? null;
        if (!element) return false;

        const scrollEl = element.closest("[data-mobile-menu-scroll]") as HTMLElement | null;
        if (scrollEl) {
          const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 2;
          const atTop = scrollEl.scrollTop <= 2;
          if (atBottom && scrollDir > 0) return false;
          if (atTop && scrollDir < 0) return false;
          return true;
        }

        return Boolean(
          element.closest(
            "[data-lenis-prevent], [data-mobile-menu-toc], [data-menu-popup-scroll]"
          )
        );
      },
    });

    lenisRef.current = lenis;
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    lenis.stop();
    document.documentElement.classList.add("intro-locked");
    document.body.classList.add("intro-locked");
    const releaseLock = () => {
      document.documentElement.classList.remove("intro-locked");
      document.body.classList.remove("intro-locked");
      lenis.start();
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    window.addEventListener("video-ended", releaseLock, { once: true });
    const safetyUnlock = window.setTimeout(releaseLock, 12000);

    lenis.on("scroll", ScrollTrigger.update);

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    let rafId = 0;
    let resizeTimer = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        rafId = requestAnimationFrame(() => {
          ScrollTrigger.refresh();
        });
      }, 250);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        requestAnimationFrame(() => ScrollTrigger.refresh());
      });
    }

    return () => {
      window.removeEventListener("wheel", onWheelDir);
      window.removeEventListener("touchstart", onTouchStartDir);
      window.removeEventListener("touchmove", onTouchMoveDir);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("video-ended", releaseLock);
      window.clearTimeout(safetyUnlock);
      cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      gsap.ticker.remove(onTick);
      lenis.destroy();
      lenisRef.current = null;
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
      document.documentElement.classList.remove("intro-locked");
      document.body.classList.remove("intro-locked");
    };
  }, []);

  return <>{children}</>;
}
