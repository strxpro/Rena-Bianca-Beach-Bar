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
import WaveDivider from "@/components/WaveDivider";
import SpatialScrollTransition from "@/components/ui/SpatialScrollTransition";
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

      {/* ── About / Stacking Cards ── */}
      <AboutGallery isEditMode={isEditMode} />

      {/* ── Spatial Push: About → Menu ── */}
      <div data-native-snap className="relative z-20 -mt-24 sm:-mt-32 md:mt-0 md:z-auto">
        <SpatialScrollTransition
          topSection={
            <div className="pointer-events-none relative h-full w-full overflow-hidden" style={{ background: "linear-gradient(180deg, #2a6a9e 0%, #1a3a5c 25%, #0d2240 60%, #0A192F 100%)" }}>
              {/* Wave at top */}
              <WaveDivider topColor="#2a6a9e" bottomColor="#1a3a5c" />
              {/* Floating gradient shapes */}
              <div className="pointer-events-none absolute left-1/2 top-[15%] hidden h-[300px] w-[300px] -translate-x-1/2 rotate-45 rounded-xl opacity-[0.08] sm:block" style={{ background: "linear-gradient(135deg, rgba(59,130,196,0.3), rgba(10,25,47,0.6))" }} />
              <div className="pointer-events-none absolute left-1/2 top-[35%] hidden h-[200px] w-[200px] -translate-x-1/2 rounded-full opacity-[0.06] sm:block" style={{ background: "linear-gradient(180deg, rgba(253,251,247,0.2), rgba(59,130,196,0.5))" }} />
              {/* Center text */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
                <T k="menu.subheading" className="font-body text-[10px] uppercase tracking-[0.3em] text-sand/30 sm:text-xs sm:tracking-[0.4em]" />
                <h2 className="font-heading text-3xl text-sand/20 sm:text-5xl md:text-7xl" style={{ fontWeight: 400, letterSpacing: "0.3em" }}>
                  MENU
                </h2>
              </div>
            </div>
          }
          bottomSection={<InteractiveBookMenu />}
        />
      </div>

      {/* ── Testimonials (above panorama) ── */}
      <div data-native-snap className="relative z-30 -mt-10 sm:-mt-14 md:-mt-8">
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
      <div data-native-snap>
        <BeachPanorama />
      </div>

      {/* ── Sunset divider: Panorama → Gallery ── */}
      <SunsetDivider />

      {/* ── Photo Gallery carousel ── */}
      <div data-native-snap>
        <PhotoGallery />
      </div>

      {/* ── Gradient bridge: Gallery → Location ── */}
      <div className="relative w-full" style={{ height: "clamp(40px, 6vh, 80px)", background: "linear-gradient(180deg, #0A192F 0%, #0d2240 50%, #0A192F 100%)" }} />

      {/* ── Location → Contact (orbital scroll transition) ── */}
      <div data-native-snap>
        <LocationContactTransition isEditMode={isEditMode} />
      </div>

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
