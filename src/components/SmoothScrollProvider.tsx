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
    /* ── Mobile-tuned Lenis. The previous config (`duration: 1.2`,
          `touchMultiplier: 2`) was the main culprit behind the
          "fast scroll skips a section" bug on phones: a 1.2 s
          easing window combined with a 2× touch boost meant that
          a single fast swipe could scroll through 1500 + px before
          ScrollTrigger had a chance to pin the next section.
          A shorter `duration` + `lerp`-based smoothing + touch
          multiplier of 1.4 keeps the silky feel while ensuring
          every pinned section gets a chance to engage. ── */
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

    if (isMobile || lowPowerDevice) {
      document.documentElement.classList.add("intro-locked");
      document.body.classList.add("intro-locked");
      const releaseLock = () => {
        document.documentElement.classList.remove("intro-locked");
        document.body.classList.remove("intro-locked");
      };
      window.addEventListener("video-ended", releaseLock, { once: true });
      const safetyUnlock = window.setTimeout(releaseLock, 12000);

      let rafId = 0;
      const onResize = () => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          ScrollTrigger.refresh();
        });
      };
      const onNativeScroll = () => ScrollTrigger.update();
      window.addEventListener("scroll", onNativeScroll, { passive: true });
      window.addEventListener("resize", onResize);
      window.addEventListener("orientationchange", onResize);

      return () => {
        window.removeEventListener("wheel", onWheelDir);
        window.removeEventListener("touchstart", onTouchStartDir);
        window.removeEventListener("touchmove", onTouchMoveDir);
        window.removeEventListener("scroll", onNativeScroll);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onResize);
        window.removeEventListener("video-ended", releaseLock);
        window.clearTimeout(safetyUnlock);
        cancelAnimationFrame(rafId);
        document.documentElement.classList.remove("intro-locked");
        document.body.classList.remove("intro-locked");
      };
    }

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

    /* ── Intro-film scroll lock ──────────────────────────────────
          The hero video plays as a fixed full-viewport element on
          top of everything; if the user scrolls during playback
          the page underneath glides past silently and they miss
          the entire intro. We park Lenis (`stop()`) AND clamp the
          DOM (via the `intro-locked` class added to <html> + body
          in globals.css) until HeroSection fires `video-ended`.
          Both layers are required — `lenis.stop()` alone only
          mutes the smooth-engine, native iOS touch/keyboard would
          still scroll. The CSS class disables the rest. ── */
    lenis.stop();
    document.documentElement.classList.add("intro-locked");
    document.body.classList.add("intro-locked");
    const releaseLock = () => {
      document.documentElement.classList.remove("intro-locked");
      document.body.classList.remove("intro-locked");
      lenis.start();
    };
    window.addEventListener("video-ended", releaseLock, { once: true });
    /* Hard safety: if the video event never fires (autoplay
       blocked, file 404, hostile browser) release the lock after
       12 s so the page is never permanently un-scrollable. */
    const safetyUnlock = window.setTimeout(releaseLock, 12000);

    lenis.on("scroll", ScrollTrigger.update);

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      window.removeEventListener("wheel", onWheelDir);
      window.removeEventListener("touchstart", onTouchStartDir);
      window.removeEventListener("touchmove", onTouchMoveDir);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("video-ended", releaseLock);
      window.clearTimeout(safetyUnlock);
      cancelAnimationFrame(rafId);
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
