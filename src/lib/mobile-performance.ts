export type MobilePerformanceProfile = {
  isMobile: boolean;
  isLowEndMobile: boolean;
  prefersReducedMotion: boolean;
  hardwareConcurrency: number;
};

export function getMobilePerformanceProfile(): MobilePerformanceProfile {
  if (typeof window === "undefined") {
    return {
      isMobile: false,
      isLowEndMobile: false,
      prefersReducedMotion: false,
      hardwareConcurrency: 8,
    };
  }

  const isMobile = window.innerWidth < 768;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hardwareConcurrency = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 8 : 8;
  const isLowEndMobile = isMobile && (prefersReducedMotion || hardwareConcurrency <= 4);

  return {
    isMobile,
    isLowEndMobile,
    prefersReducedMotion,
    hardwareConcurrency,
  };
}
