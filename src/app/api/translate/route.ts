import { NextRequest, NextResponse } from "next/server";
import type { Locale } from "@/i18n/translations";

const TARGET_LANGUAGE_MAP: Record<Locale, string> = {
  pl: "pl",
  it: "it",
  es: "es",
  fr: "fr",
  de: "de",
  en: "en",
};

function extractTranslatedText(payload: unknown): string {
  if (!Array.isArray(payload)) {
    throw new Error("invalid_translate_payload");
  }

  const sentences = payload[0];
  if (!Array.isArray(sentences)) {
    throw new Error("invalid_translate_sentences");
  }

  return sentences
    .map((sentence) => (Array.isArray(sentence) ? String(sentence[0] ?? "") : ""))
    .join("")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const targetLocale = body?.targetLocale as Locale | undefined;

    if (!text || !targetLocale || !(targetLocale in TARGET_LANGUAGE_MAP)) {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: "text_too_long" }, { status: 400 });
    }

    const targetLanguage = TARGET_LANGUAGE_MAP[targetLocale];
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "translate_failed" }, { status: 502 });
    }

    const data = await res.json();
    const translatedText = extractTranslatedText(data);

    if (!translatedText) {
      return NextResponse.json({ error: "empty_translation" }, { status: 502 });
    }

    return NextResponse.json({ text: translatedText });
  } catch (error) {
    console.error("[api/translate]", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
