import Header from "@/components/Header";
import SideDotsNav from "@/components/SideDotsNav";
import { T } from "@/components/ui/TranslatedText";
import HeroSection from "@/components/HeroSection";
import HeroVideoParallax from "@/components/HeroVideoParallax";
import AboutGallery from "@/components/AboutGallery";
import InteractiveBookMenu from "@/components/InteractiveBookMenu";
import LocationContactTransition from "@/components/LocationContactTransition";
import BackgroundAnimationLayer from "@/components/BackgroundAnimationLayer";
import BeachPanorama from "@/components/BeachPanorama";
import PhotoGallery from "@/components/PhotoGallery";
import Testimonials from "@/components/Testimonials";
import SunsetDivider from "@/components/SunsetDivider";
import { EditModeBar } from "@/components/EditModeBar";

type PageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const isEditMode = params?.edit === "1";

  return (
    <>
      {/* ── Header (z-100) — logo docks on scroll ── */}
      <Header />

      {/* ── Side dots nav (z-90) — vertical rail, right edge. Smooth
            jumps, active-state indicator, border = page progress. ── */}
      <SideDotsNav />

      {/* ── Cinematic preloader (z-50) + video (z-10) ── */}
      <HeroSection />

      <main className="relative z-0">
        {/* Fixed global background layer */}
        <BackgroundAnimationLayer />

        {/* ── Scroll parallax (z-0 — revealed when video fades) ── */}
        <HeroVideoParallax />

        {/* ── About / Simple Looping Video ── */}
        <AboutGallery isEditMode={isEditMode} />

      {/* ── Menu ── */}
      <div className="relative z-20">
        <InteractiveBookMenu />
      </div>

      {/* ── Testimonials (above panorama) ── */}
      <div className="relative z-30 -mt-10 sm:-mt-14 md:-mt-8">
        <Testimonials />
      </div>

      {/* ── Gradient bridge: Testimonials → Panorama ── */}
      <div
        className="relative z-5 flex w-full flex-wrap"
        style={{
          height: "clamp(180px, 28vh, 260px)",
          background:
            "linear-gradient(180deg, #8ec5e8 0%, #5ba3d9 18%, #2a6a9e 38%, #1a4a6e 58%, #0d2240 80%, #0A192F 100%)",
        }}
      />

      {/* ── Panorama full-screen title + slideshow — pinned with
            GSAP ScrollTrigger and a magnetic scroll-lock release. ── */}
      <BeachPanorama />

      {/* ── Sunset divider: Panorama → Gallery ── */}
      <SunsetDivider />

      {/* ── Photo Gallery carousel ── */}
      <PhotoGallery />

      {/* ── Bridge - increased height to prevent pin overlap ── */}
      <div
        className="relative w-full"
        style={{
          height: "clamp(60px, 10vh, 120px)",
          background: "linear-gradient(180deg, #0A192F 0%, #0d2240 50%, #0A192F 100%)",
          zIndex: 5,
        }}
      />

      {/* ── Location → Contact (orbital scroll transition) ── */}
      <LocationContactTransition isEditMode={isEditMode} />

      {/* ── Footer ── */}
      <footer className="px-4 py-8 text-center sm:px-8 sm:py-12" style={{ background: "linear-gradient(180deg, #0A192F 0%, #060f1e 100%)" }}>
        <div className="mb-4 flex items-center justify-center gap-4">
          <a href="https://www.instagram.com/renabiancabeachbar?igsh=MXF1NWNyMTdmcHpyag==" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-sand/40 transition-colors hover:border-ocean/40 hover:text-ocean" aria-label="Instagram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
          </a>
          <a href="https://www.facebook.com/share/19uQ4E9XTK/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-sand/40 transition-colors hover:border-ocean/40 hover:text-ocean" aria-label="Facebook">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
        </div>
        <p className="font-body text-xs text-sand/40 tracking-wide sm:text-sm">
          <T k="footer.rights" />
        </p>
      </footer>
      </main>

      {/* ── Edit mode toolbar (only when ?edit=1) ── */}
      {isEditMode && <EditModeBar />}
    </>
  );
}
