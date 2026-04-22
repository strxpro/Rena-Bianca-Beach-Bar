"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { translations, COUNTRY_TO_LOCALE, type Locale, type TranslationKeys } from "./translations";

const STORAGE_KEY = "rena-bianca-locale";
const DEFAULT_LOCALE: Locale = "pl";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof TranslationKeys) => string;
  overrides: Record<string, string>;
  setOverride: (key: string, value: string) => void;
  saveOverrides: () => Promise<void>;
  isSaving: boolean;
  hasUnsaved: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key as string,
  overrides: {},
  setOverride: () => {},
  saveOverrides: async () => {},
  isSaving: false,
  hasUnsaved: false,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [initialized, setInitialized] = useState(false);
  const [overrides, setOverridesState] = useState<Record<string, string>>({});
  const [savedOverrides, setSavedOverrides] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Locale detection
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && stored in translations) {
      setLocaleState(stored);
      setInitialized(true);
      return;
    }

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
      .catch(() => {})
      .finally(() => setInitialized(true));
  }, []);

  // Load content overrides
  useEffect(() => {
    fetch("/api/admin/content")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setOverridesState(data ?? {});
        setSavedOverrides(data ?? {});
      })
      .catch(() => {});
  }, []);

  const wrapRef = useRef<HTMLDivElement>(null);

  const setLocale = useCallback((l: Locale) => {
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
      const k = key as string;
      if (overrides[k]) return overrides[k];
      return (translations[locale] as Record<string, string>)[k] ?? k;
    },
    [locale, overrides]
  );

  const setOverride = useCallback((key: string, value: string) => {
    setOverridesState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const hasUnsaved = JSON.stringify(overrides) !== JSON.stringify(savedOverrides);

  const saveOverrides = useCallback(async () => {
    setIsSaving(true);
    try {
      await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrides),
      });
      setSavedOverrides({ ...overrides });
    } catch {
      // silent
    } finally {
      setIsSaving(false);
    }
  }, [overrides]);

  if (!initialized) return null;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, overrides, setOverride, saveOverrides, isSaving, hasUnsaved }}>
      <div ref={wrapRef} style={{ transition: "opacity 0.3s ease-out" }}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}
