import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { v2 as cloudinary } from "cloudinary";

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

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
  const maxRequests = 2;
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
    const { name, rating, text, avatar, photos, token, hp, formLoadedAt } = body;
    const countryCode = (req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || "")
      .trim()
      .toUpperCase();

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

    if (!name || !text) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    if (text.length > 1000) {
      return NextResponse.json({ error: "too_long" }, { status: 400 });
    }

    const photoUrls: string[] = [];
    const photosArray: string[] = Array.isArray(photos) ? photos.slice(0, 3) : [];
    if (photosArray.length > 0 && process.env.CLOUDINARY_CLOUD_NAME) {
      for (const base64 of photosArray) {
        try {
          const upload = await cloudinary.uploader.upload(base64, {
            folder: "rena-bianca/reviews",
            transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }],
          });
          photoUrls.push(upload.secure_url);
        } catch (uploadErr) {
          console.error("[cloudinary upload]", uploadErr);
        }
      }
    }

    const firstPhoto = photoUrls[0] || avatar || "";

    const webhook = process.env.REVIEW_WEBHOOK || process.env.NEXT_PUBLIC_REVIEW_WEBHOOK;
    if (webhook) {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Nome: name,
          Voto: rating ?? 5,
          Commento: text,
          Avatar: firstPhoto,
          Foto1: photoUrls[0] || "",
          Foto2: photoUrls[1] || "",
          Foto3: photoUrls[2] || "",
          Stato: "Pendente",
          Data: new Date().toISOString().split("T")[0],
          CountryCode: /^[A-Z]{2}$/.test(countryCode) ? countryCode : "",
        }),
      });
    }

    revalidatePath("/");
    revalidatePath("/it");
    revalidatePath("/pl");
    revalidatePath("/en");
    revalidatePath("/fr");
    revalidatePath("/de");
    revalidatePath("/es");

    return NextResponse.json({ success: true, countryCode: /^[A-Z]{2}$/.test(countryCode) ? countryCode : null });
  } catch (err) {
    console.error("[api/review]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
