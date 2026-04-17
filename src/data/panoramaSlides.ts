/* Shared slide list for BeachPanorama (interactive slideshow +
   scroll-pinned reveal). Keys are i18n paths. */
export type PanoramaSlideTitleKey =
  | "panorama.slide1.title"
  | "panorama.slide2.title"
  | "panorama.slide3.title"
  | "panorama.slide4.title"
  | "panorama.slide5.title";

export type PanoramaSlideSubtitleKey =
  | "panorama.slide1.subtitle"
  | "panorama.slide2.subtitle"
  | "panorama.slide3.subtitle"
  | "panorama.slide4.subtitle"
  | "panorama.slide5.subtitle";

export const PANORAMA_SLIDES: {
  src: string;
  titleKey: PanoramaSlideTitleKey;
  subtitleKey: PanoramaSlideSubtitleKey;
}[] = [
  { src: "/panorama/1.png", titleKey: "panorama.slide1.title", subtitleKey: "panorama.slide1.subtitle" },
  { src: "/panorama/2.png", titleKey: "panorama.slide2.title", subtitleKey: "panorama.slide2.subtitle" },
  { src: "/panorama/3.png", titleKey: "panorama.slide3.title", subtitleKey: "panorama.slide3.subtitle" },
  { src: "/panorama/4.png", titleKey: "panorama.slide4.title", subtitleKey: "panorama.slide4.subtitle" },
  { src: "/panorama/5.png", titleKey: "panorama.slide5.title", subtitleKey: "panorama.slide5.subtitle" },
];
