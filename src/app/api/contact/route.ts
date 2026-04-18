import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT = new Map<string, { count: number; reset: number }>();

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token }),
  });
  const data = await res.json();
  return data.success === true;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxRequests = 3;
  const entry = RATE_LIMIT.get(ip);
  if (!entry || now > entry.reset) {
    RATE_LIMIT.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message, phone, phoneDisplay, dialCode, phoneCountry, phoneCountryIso, language, date, token, hp, formLoadedAt } = body;

    if (hp) return NextResponse.json({ error: "rejected" }, { status: 400 });

    if (formLoadedAt && Date.now() - formLoadedAt < 3000) {
      return NextResponse.json({ error: "too_fast" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "rate_limit" }, { status: 429 });
    }

    if (token) {
      const valid = await verifyTurnstile(token);
      if (!valid) return NextResponse.json({ error: "captcha_failed" }, { status: 403 });
    }

    if (!name || !email || !message) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: "too_long" }, { status: 400 });
    }

    const webhook = process.env.NEXT_PUBLIC_CONTACT_WEBHOOK || process.env.CONTACT_WEBHOOK;
    if (webhook) {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          phone: phone || "",
          phoneDisplay: phoneDisplay || "Numero non fornito",
          dialCode: dialCode || "",
          phoneCountry: phoneCountry || "",
          phoneCountryIso: phoneCountryIso || "",
          source: "site_contact",
          language: language || "it",
          date: date || new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) throw new Error("webhook failed");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/contact]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
