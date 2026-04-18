"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
  // Enable normalizeScroll strictly for mobile to kill address-bar jump bugs
  if (window.innerWidth < 768) {
    ScrollTrigger.normalizeScroll({
      allowNestedScroll: true,
    });
  }
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
    const lenis = new Lenis({
      duration: isMobile ? 0.9 : 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: isMobile ? 1.4 : 1.8,
      wheelMultiplier: 1,
      infinite: false,
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

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
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
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("video-ended", releaseLock);
      window.clearTimeout(safetyUnlock);
      cancelAnimationFrame(rafId);
      gsap.ticker.remove(lenis.raf as never);
      lenis.destroy();
      lenisRef.current = null;
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
      document.documentElement.classList.remove("intro-locked");
      document.body.classList.remove("intro-locked");
    };
  }, []);

  return <>{children}</>;
}
