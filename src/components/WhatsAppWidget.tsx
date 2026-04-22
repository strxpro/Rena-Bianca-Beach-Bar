"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "393001234567";
const copyByLocale = {
  pl: { prompt: "Napisz wiadomość...", send: "Wyślij", title: "WhatsApp", subtitle: "Skontaktuj się z nami", cta: "Otwórz czat" },
  it: { prompt: "Scrivi un messaggio...", send: "Invia", title: "WhatsApp", subtitle: "Scrivici ora", cta: "Apri chat" },
  es: { prompt: "Escribe un mensaje...", send: "Enviar", title: "WhatsApp", subtitle: "Escríbenos", cta: "Abrir chat" },
  fr: { prompt: "Écrivez un message...", send: "Envoyer", title: "WhatsApp", subtitle: "Contactez-nous", cta: "Ouvrir le chat" },
  de: { prompt: "Nachricht schreiben...", send: "Senden", title: "WhatsApp", subtitle: "Schreib uns", cta: "Chat öffnen" },
  en: { prompt: "Type a message...", send: "Send", title: "WhatsApp", subtitle: "Chat with us", cta: "Open chat" },
} as const;

export function WhatsAppWidget() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const copy = useMemo(() => copyByLocale[locale] ?? copyByLocale.en, [locale]);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const hero = document.querySelector("[data-parallax-container]");
    if (!hero) {
      const onScroll = () => setIsVisible(window.scrollY > window.innerHeight * 0.6);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isPastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setIsVisible(isPastHero);
      },
      { threshold: 0.08 }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);

  const handleSend = () => {
    const text = message.trim();
    if (!text) return;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, "_blank", "noopener,noreferrer");
    setMessage("");
    setIsOpen(false);
  };

  if (pathname.startsWith("/admin")) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-[180] flex flex-col items-end gap-3 transition-all duration-500 ${
        isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0"
      }`}
      style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.24))" }}
    >
      {isOpen && (
        <div
          className="w-[min(92vw,320px)] rounded-[22px] border border-white/15 bg-[#0b2038]/95 p-4 backdrop-blur-xl"
          style={{ boxShadow: "0 20px 56px -18px rgba(0,0,0,0.62)" }}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="font-body text-sm font-semibold text-sand">{copy.title}</p>
              <p className="font-body text-xs text-sand/65">{copy.subtitle}</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-full p-1.5 text-sand/45 transition-colors hover:text-sand" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={copy.prompt}
            rows={3}
            className="mb-3 w-full resize-none rounded-xl border border-white/10 bg-navy/65 px-3 py-2.5 font-body text-sm text-sand outline-none transition-colors placeholder:text-sand/35 focus:border-ocean/40"
          />
          <button type="button" onClick={handleSend} disabled={!message.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-2.5 font-body text-sm font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
            <Send className="h-4 w-4" />
            {copy.send}
          </button>
        </div>
      )}

      <button type="button" aria-label={copy.cta} onClick={() => setIsOpen((v) => !v)} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_4px_24px_rgba(37,211,102,0.45)] transition-transform hover:scale-110 active:scale-95">
        <MessageCircle className="h-7 w-7" />
      </button>
    </div>
  );
}
