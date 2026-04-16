"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { translations, COUNTRY_TO_LOCALE, type Locale, type TranslationKeys } from "./translations";

/* ═══════════════════════════════════════════════════════════════
   I18N CONTEXT — Geolocation-based default + manual switching
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "rena-bianca-locale";
const DEFAULT_LOCALE: Locale = "pl";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof TranslationKeys) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key as string,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [initialized, setInitialized] = useState(false);

  // On mount: check localStorage first, then geolocation
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && stored in translations) {
      setLocaleState(stored);
      setInitialized(true);
      return;
    }

    // Geolocation via free API (no key needed)
    fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) })
      .then((r) => r.json())
      .then((data) => {
        const countryCode = (data?.country_code || "").toUpperCase();
        const detected = COUNTRY_TO_LOCALE[countryCode];
        if (detected) {
          setLocaleState(detected);
          localStorage.setItem(STORAGE_KEY, detected);
        }
      })
      .catch(() => {
        // Silently fall back to default
      })
      .finally(() => setInitialized(true));
  }, []);

  const wrapRef = useRef<HTMLDivElement>(null);

  const setLocale = useCallback((l: Locale) => {
    // Smooth fade-out, swap, fade-in — no remount
    const el = wrapRef.current;
    if (el) {
      el.style.transition = "opacity 0.18s ease-out";
      el.style.opacity = "0.5";
      setTimeout(() => {
        setLocaleState(l);
        localStorage.setItem(STORAGE_KEY, l);
        requestAnimationFrame(() => {
          el.style.opacity = "1";
        });
      }, 180);
    } else {
      setLocaleState(l);
      localStorage.setItem(STORAGE_KEY, l);
    }
  }, []);

  const t = useCallback(
    (key: keyof TranslationKeys): string => {
      return (translations[locale] as Record<string, string>)[key as string] ?? key;
    },
    [locale]
  );

  // Prevent flash — render children only after init (fast, ~0-3s)
  if (!initialized) return null;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      <div ref={wrapRef} style={{ transition: "opacity 0.3s ease-out" }}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}
