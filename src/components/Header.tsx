"use client";

import { useRef, useState, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { LOCALE_LABELS, LOCALE_FLAGS, type Locale } from "@/i18n/translations";

/* ═══════════════════════════════════════════════════════════════
   HEADER — fixed top-0 z-100
   ───────────────────────────────────────────────────────────────
   Shows early (during video) via 'header-show' event.
   No logo here — the single logo lives in HeroVideoParallax
   and docks itself into the header area via GSAP.
   isDocked is toggled by a 'logo-docked' custom event.
   ═══════════════════════════════════════════════════════════════ */

export const HEADER_H = 72;
export const LOGO_DOCKED_W = 120;
export const LOGO_DOCKED_H = 40;

const NAV_KEYS: { key: "nav.menu" | "nav.about" | "nav.gallery" | "nav.contact" | "nav.reservation"; href: string }[] = [
  { key: "nav.menu", href: "#menu" },
  { key: "nav.about", href: "#about" },
  { key: "nav.gallery", href: "#gallery" },
  { key: "nav.contact", href: "#contact" },
  { key: "nav.reservation", href: "#reservation" },
];

const NAV_UNDERLINE_PATHS = [
  "M5 21C26.8 16.2 49.6 11.6 71.8 14.7C85 16.5 97 21.8 110 24.4C116.4 25.7 123 25.5 129 22.6C136 19.3 142.6 15.1 150.1 13.3C156.8 11.7 161.7 14.6 167.9 16.8C181.6 21.7 195 22.6 209.3 21.4C224.7 20.1 239.9 18 255.4 18.3C272 18.6 288.4 18.9 305 18",
  "M5 24.3C26.2 20.3 47.7 17 69.1 13.8C98 9.6 128.4 4 158.1 5.1C172.6 5.7 187.7 8.7 201.6 12C207.2 13.3 215.4 14.9 220.1 18.4C224.4 21.5 220.7 25.7 217.2 27.6C208.3 32.5 197.2 34.3 186.7 34.8C183.2 35 147.2 36.3 155.1 26.6C158.1 22.9 163 20.6 167.8 18.8C178.4 14.7 190.1 12.1 201.6 10.4C218.4 7.9 235.5 7.1 252.5 7.5C258.5 7.6 264.4 7.9 270.3 8.4C280.3 9.3 296 10.9 305 13",
  "M5 29.9C52.3 26.9 99.4 21.7 146.5 17.2C151.8 16.7 157.1 16 162.4 15.7C163.3 15.6 165.1 15.4 164.4 16.4C161.7 20.4 157.1 23.8 154 27.5C153.2 28.4 148.2 33.5 150.7 34.7C153.6 36.1 163.6 32.6 165 32.2C178.5 28.4 191.5 23.6 204.9 19.5C231.9 11.3 259.3 5.8 288.8 5.1C294.1 5 299.7 4.8 305 5.5",
  "M17 32.7C32.2 32.8 47.5 32.8 62.7 32.8C67.3 32.8 96.5 33.1 104.7 32.1C113.6 31 104.5 28.3 102 27.3C90 22.3 77.4 19 65 15.1C57.9 12.8 37.3 8.5 44.2 6.1C51 3.8 64.3 5.8 70.4 6C105.9 6.8 141.3 7.6 176.8 8.6C217.9 9.8 258.9 11.1 300 14.5",
];

const ALL_LOCALES: Locale[] = ["pl", "it", "es", "fr", "de", "en"];

function FlagSvg({ loc, size = 40, clipId }: { loc: Locale; size?: number; clipId: string }) {
  const flag = LOCALE_FLAGS[loc];
  const n = flag.stripes.length;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
      <clipPath id={clipId}><circle cx={size / 2} cy={size / 2} r={size / 2} /></clipPath>
      <g clipPath={`url(#${clipId})`}>
        {flag.direction === "h"
          ? flag.stripes.map((color, i) => (
              <rect key={i} y={(size / n) * i} width={size} height={size / n + 0.5} fill={color} />
            ))
          : flag.stripes.map((color, i) => (
              <rect key={i} x={(size / n) * i} width={size / n + 0.5} height={size} fill={color} />
            ))}
        {/* Union Jack cross for English */}
        {loc === "en" && (
          <>
            <rect x={size * 0.4} y={0} width={size * 0.2} height={size} fill="#fff" />
            <rect x={0} y={size * 0.4} width={size} height={size * 0.2} fill="#fff" />
            <rect x={size * 0.44} y={0} width={size * 0.12} height={size} fill="#c8102e" />
            <rect x={0} y={size * 0.44} width={size} height={size * 0.12} fill="#c8102e" />
            {/* Diagonals */}
            <line x1={0} y1={0} x2={size} y2={size} stroke="#fff" strokeWidth={size * 0.08} />
            <line x1={size} y1={0} x2={0} y2={size} stroke="#fff" strokeWidth={size * 0.08} />
            <line x1={0} y1={0} x2={size} y2={size} stroke="#c8102e" strokeWidth={size * 0.04} />
            <line x1={size} y1={0} x2={0} y2={size} stroke="#c8102e" strokeWidth={size * 0.04} />
          </>
        )}
      </g>
    </svg>
  );
}

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDocked, setIsDocked] = useState(false);
  const [visible, setVisible] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();

  /* ── Show header early (fired by HeroSection during video) ── */
  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener("header-show", show, { once: true });
    window.addEventListener("preloader-complete", show, { once: true });
    const fallback = setTimeout(show, 12000);
    return () => {
      window.removeEventListener("header-show", show);
      window.removeEventListener("preloader-complete", show);
      clearTimeout(fallback);
    };
  }, []);

  /* ── Logo docked state (driven by HeroVideoParallax) ── */
  useEffect(() => {
    const onDock = (e: Event) => {
      setIsDocked((e as CustomEvent).detail?.docked ?? false);
    };
    window.addEventListener("logo-docked", onDock);
    return () => window.removeEventListener("logo-docked", onDock);
  }, []);

  /* ── Close menu on Escape ── */
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMenuOpen]);

  return (
    <>
      <header
        ref={headerRef}
        data-header
        className={`fixed top-0 left-1/2 -translate-x-1/2 z-100 flex items-center justify-between
                    w-[calc(100%-1rem)] sm:w-[calc(100%-1.5rem)] md:w-[calc(100%-3rem)] max-w-[1400px]
                    px-3 sm:px-5 md:px-8 rounded-b-2xl
                    transition-all duration-500
                    ${visible ? "opacity-100" : "pointer-events-none opacity-0"}
                    ${isDocked
                      ? "border border-white/20 border-t-0 bg-white/90 shadow-lg backdrop-blur-md"
                      : "border border-white/10 border-t-0 bg-white/5 backdrop-blur-sm"
                    }`}
        style={{ height: HEADER_H }}
      >
        {/* ═══ LEFT — Flag (circular) + Language dropdown + Social media
              Compact, fully responsive: everything stays visible from
              the tiniest phone up to desktop. Icons shrink on small
              screens so we never overflow the header. ═══ */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="relative">
            <button
              onClick={() => setLangOpen((p) => !p)}
              className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border transition-colors sm:h-9 sm:w-9
                         ${isDocked ? "border-navy/20 hover:bg-navy/5" : "border-white/20 hover:bg-white/10"}`}
              aria-label={t("nav.changeLang")}
            >
              <div className="h-6 w-6 sm:h-7 sm:w-7">
                <FlagSvg loc={locale} clipId="flag-main" />
              </div>
            </button>

            {/* Language dropdown */}
            {langOpen && (
              <div
                className="absolute left-0 top-full z-50 mt-2 min-w-[140px] overflow-hidden rounded-xl border border-white/15 bg-navy/95 shadow-2xl backdrop-blur-xl"
                onMouseLeave={() => setLangOpen(false)}
              >
                {ALL_LOCALES.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => { setLocale(loc); setLangOpen(false); }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 font-body text-sm transition-colors
                               ${locale === loc ? "bg-ocean/20 text-sand" : "text-sand/60 hover:bg-white/10 hover:text-sand"}`}
                  >
                    <div className="h-5 w-5 shrink-0">
                      <FlagSvg loc={loc} clipId={`flag-dd-${loc}`} />
                    </div>
                    {LOCALE_LABELS[loc]}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Instagram — visible on EVERY screen (compact on mobile) */}
          <a
            href="https://www.instagram.com/renabiancabeachbar?igsh=MXF1NWNyMTdmcHpyag=="
            target="_blank"
            rel="noopener noreferrer"
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors sm:h-8 sm:w-8
                       ${isDocked ? "text-navy/60 hover:text-ocean" : "text-white/60 hover:text-white"}`}
            aria-label="Instagram"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:h-4 sm:w-4">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </a>
          {/* Facebook — visible on EVERY screen (compact on mobile) */}
          <a
            href="https://www.facebook.com/share/19uQ4E9XTK/?mibextid=wwXIfr"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors sm:h-8 sm:w-8
                       ${isDocked ? "text-navy/60 hover:text-ocean" : "text-white/60 hover:text-white"}`}
            aria-label="Facebook"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="sm:h-4 sm:w-4">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </a>
        </div>

        {/* ═══ CENTRE — Reserved spacer for the docked logo ════════
              An INVISIBLE flex item that sits between the left (lang
              + social) and right (nav / hamburger) groups. Its
              explicit min-width reserves breathing room around the
              docked logo so the flanking UI physically can't touch
              it — the rest of the header "respects" the logo instead
              of crowding it. The animated fixed logo (from
              HeroVideoParallax) and the static reference img below
              sit on top of this space via absolute positioning. ══ */}
        <div
          aria-hidden
          className="pointer-events-none shrink-0"
          style={{ width: "clamp(120px, 22vw, 220px)" }}
        />

        {/* Static reference logo — shown once docked (isDocked).
             The animated fixed logo (z:115) from HeroVideoParallax
             sits on top; this one is a graceful fallback. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <img
            src="/logo.svg"
            alt="Rena Bianca"
            className="transition-opacity duration-300"
            style={{
              width: "clamp(68px, 9vw, 98px)",
              height: "auto",
              opacity: isDocked ? 1 : 0,
              filter: isDocked
                ? "drop-shadow(0 4px 14px rgba(59,130,196,0.25))"
                : undefined,
            }}
          />
        </div>

        {/* ═══ RIGHT — Desktop nav links ═══ */}
        <nav className="hidden shrink-0 items-center gap-1 md:flex lg:gap-3 xl:gap-5">
          {NAV_KEYS.map((item, index) => {
            if (item.key === "nav.reservation") {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    const target = document.querySelector(item.href);
                    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                    setIsMenuOpen(false);
                  }}
                  className={`group/reservation relative ml-1 flex h-10 min-w-[128px] items-center justify-center overflow-hidden rounded-full border px-4 font-body text-[11px] font-medium uppercase tracking-[0.22em] transition-colors duration-300 lg:min-w-[144px] lg:px-5 lg:text-xs
                             ${isDocked
                               ? "border-navy/15 bg-navy/5 text-navy hover:border-ocean/30 hover:bg-ocean/10"
                               : "border-white/20 bg-white/8 text-white hover:border-white/35 hover:bg-white/14"}`}
                >
                  <span className="transition-transform duration-500 group-hover/reservation:translate-x-40">
                    {t(item.key)}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center -translate-x-40 transition-transform duration-500 group-hover/reservation:translate-x-0">
                    {t(item.key)}
                  </span>
                </a>
              );
            }

            const underlinePath = NAV_UNDERLINE_PATHS[index % NAV_UNDERLINE_PATHS.length];

            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  const target = document.querySelector(item.href);
                  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                  setIsMenuOpen(false);
                }}
                className={`group/nav relative select-none whitespace-nowrap px-2 py-1.5 font-body text-[11px] uppercase tracking-wider transition-colors duration-300 lg:px-3 lg:text-[13px] lg:tracking-widest xl:px-4 xl:text-sm
                           ${isDocked ? "text-navy hover:text-ocean" : "text-white/85 hover:text-white"}`}
              >
                <span className="relative z-10">{t(item.key)}</span>
                <span className="pointer-events-none absolute inset-x-0 -bottom-2 h-3 text-ocean/90">
                  <svg viewBox="0 0 310 40" fill="none" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                    <path
                      d={underlinePath}
                      pathLength={100}
                      className="fill-none stroke-current stroke-6 [stroke-dasharray:100] [stroke-dashoffset:100] transition-[stroke-dashoffset] duration-500 ease-out group-hover/nav:[stroke-dashoffset:0]"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </a>
            );
          })}
        </nav>

        {/* ═══ RIGHT — Mobile hamburger ═══ */}
        <button
          className={`relative flex h-12 w-12 flex-col items-center justify-center rounded-full
                     border transition-colors md:hidden
                     ${isDocked ? "border-navy/20 hover:bg-navy/5" : "border-white/20 hover:bg-white/10"}`}
          aria-label={isMenuOpen ? "Zamknij menu" : "Otwórz menu"}
          onClick={() => setIsMenuOpen((p) => !p)}
        >
          <span
            className={`block rounded-full transition-all duration-300 ease-in-out ${isDocked ? "bg-navy" : "bg-white"}`}
            style={{ width: 22, height: 2, transform: isMenuOpen ? "translateY(7px) rotate(45deg)" : "none" }}
          />
          <span
            className={`my-[5px] block rounded-full transition-all duration-300 ease-in-out ${isDocked ? "bg-navy" : "bg-white"}`}
            style={{ width: 18, height: 2, opacity: isMenuOpen ? 0 : 1, transform: isMenuOpen ? "scale(0)" : "none" }}
          />
          <span
            className={`block rounded-full transition-all duration-300 ease-in-out ${isDocked ? "bg-navy" : "bg-white"}`}
            style={{ width: 14, height: 2, transform: isMenuOpen ? "translateY(-7px) rotate(-45deg)" : "none" }}
          />
        </button>
      </header>

      {/* ═══ Mobile menu — compact 3D drop-down panel ══════════════
            Opens beneath the header (not fullscreen) so it only takes
            up the vertical space actually needed for the links. A
            `perspective` wrapper plus a rotateX fold animation gives
            it the "smooth 3D opening" feel requested in the brief:
            panel tilts from −25deg (closed) to 0deg (open), with the
            transform origin anchored at the top so it appears to
            unfold down from the header itself.

            A dim backdrop sits behind it so tapping outside closes
            the menu — no fullscreen block anymore. ═══════════════════ */}
      {/* Tap-outside backdrop */}
      <div
        onClick={() => setIsMenuOpen(false)}
        className={`fixed inset-0 z-98 bg-navy/40 backdrop-blur-sm transition-opacity duration-300 md:hidden
                    ${isMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden="true"
      />

      {/* 3D-folding panel */}
      <div
        className="fixed left-1/2 z-99 w-[calc(100%-1.5rem)] max-w-[420px] -translate-x-1/2 md:hidden"
        style={{
          top: HEADER_H + 10,
          perspective: "1200px",
        }}
      >
        <div
          className={`origin-top overflow-hidden rounded-2xl border border-white/10 bg-navy/95 shadow-2xl backdrop-blur-xl
                      transition-all duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]
                      ${isMenuOpen
                        ? "pointer-events-auto opacity-100 [transform:rotateX(0deg)_translateY(0)]"
                        : "pointer-events-none opacity-0 [transform:rotateX(-25deg)_translateY(-12px)]"}`}
        >
          {/* Links — staggered fade-in uses CSS delay based on index */}
          <nav className="flex flex-col px-2 py-2">
            {NAV_KEYS.map((item, i) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  setIsMenuOpen(false);
                  setTimeout(() => {
                    const target = document.querySelector(item.href);
                    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 320);
                }}
                style={{
                  transitionDelay: isMenuOpen ? `${80 + i * 50}ms` : "0ms",
                }}
                className={`group/mob flex items-center justify-between rounded-xl px-4 py-3 font-heading text-lg text-sand transition-all duration-300 hover:bg-white/5 hover:text-ocean
                            ${isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
              >
                <span>{t(item.key)}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="text-sand/30 transition-transform duration-300 group-hover/mob:translate-x-1 group-hover/mob:text-ocean"
                >
                  <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ))}
          </nav>

          {/* Social row inside the menu — consistent on every device */}
          <div className="flex items-center justify-center gap-3 border-t border-white/10 px-4 py-3">
            <a
              href="https://www.instagram.com/renabiancabeachbar?igsh=MXF1NWNyMTdmcHpyag=="
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-sand/60 transition-colors hover:border-ocean/40 hover:text-ocean"
              aria-label="Instagram"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/share/19uQ4E9XTK/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-sand/60 transition-colors hover:border-ocean/40 hover:text-ocean"
              aria-label="Facebook"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
