"use client";

import { useState } from "react";
import { ArrowLeft, Check, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";

export function EditModeBar() {
  const { saveOverrides, isSaving, hasUnsaved } = useI18n();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await saveOverrides();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] flex items-center justify-between gap-4 border-t border-white/10 bg-[#0b1f39]/96 px-5 py-3.5 backdrop-blur-xl shadow-[0_-16px_50px_-16px_rgba(0,0,0,0.85)]">
      <div className="flex items-center gap-3 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
        </span>
        <span className="font-body text-xs text-sand/65 truncate hidden sm:block">
          Tryb edycji — kliknij <strong className="text-sand/90 font-semibold">ołówek</strong> przy sekcji aby edytować tekst lub zdjęcie
        </span>
        <span className="font-body text-xs text-sand/65 sm:hidden">Tryb edycji</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-sand/60 hover:text-sand transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Wróć do panelu</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || (!hasUnsaved && !saved)}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium text-white transition-all duration-200 disabled:opacity-40"
          style={{ background: saved ? "rgba(34,197,94,0.85)" : "rgba(59,130,196,0.9)" }}
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {isSaving ? "Zapisywanie…" : saved ? "Zapisano!" : "Zapisz zmiany"}
        </button>
      </div>
    </div>
  );
}
