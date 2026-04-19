"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

const STORAGE_KEY = "rena-bianca-cookie-consent";
const COOKIE_NAME = "rena_bianca_cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type ConsentValue = "accepted" | "essential";

declare global {
  interface Window {
    __renaPreloaderComplete?: boolean;
  }
}

function readCookieConsent(): ConsentValue | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  const value = match?.split("=")[1];
  return value === "accepted" || value === "essential" ? value : null;
}

function persistCookieConsent(value: ConsentValue) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, value);
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export default function CookieConsentBanner() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [readyAfterIntro, setReadyAfterIntro] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const stored = (localStorage.getItem(STORAGE_KEY) as ConsentValue | null) || readCookieConsent();
    if (stored) {
      setVisible(false);
      return;
    }

    const showBanner = () => {
      setReadyAfterIntro(true);
      setVisible(true);
    };

    if (window.__renaPreloaderComplete || document.documentElement.dataset.preloaderComplete === "true") {
      showBanner();
      return;
    }

    window.addEventListener("preloader-complete", showBanner, { once: true });
    return () => window.removeEventListener("preloader-complete", showBanner);
  }, [mounted]);

  const handleConsent = (value: ConsentValue) => {
    persistCookieConsent(value);
    setVisible(false);
  };

  if (!mounted || !readyAfterIntro || !visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-140 flex justify-center px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-[26px] border border-white/12 bg-navy/92 p-4 shadow-[0_28px_80px_-28px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <span className="mb-2 inline-flex rounded-full border border-ocean/30 bg-ocean/10 px-3 py-1 font-body text-[10px] uppercase tracking-[0.24em] text-sand/75 sm:text-[11px]">
              {t("cookies.badge")}
            </span>
            <h3 className="font-heading text-xl text-sand sm:text-2xl" style={{ fontWeight: 400 }}>
              {t("cookies.title")}
            </h3>
            <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-sand/65 sm:text-[15px]">
              {t("cookies.description")}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:min-w-[220px]">
            <button
              type="button"
              onClick={() => handleConsent("accepted")}
              className="inline-flex justify-center rounded-full border border-ocean/35 bg-ocean/18 px-5 py-3 font-body text-xs uppercase tracking-[0.22em] text-sand transition-colors duration-300 hover:bg-ocean/28 sm:text-sm"
            >
              {t("cookies.accept")}
            </button>
            <button
              type="button"
              onClick={() => handleConsent("essential")}
              className="inline-flex justify-center rounded-full border border-white/12 bg-white/6 px-5 py-3 font-body text-xs uppercase tracking-[0.22em] text-sand/80 transition-colors duration-300 hover:bg-white/10 sm:text-sm"
            >
              {t("cookies.reject")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
