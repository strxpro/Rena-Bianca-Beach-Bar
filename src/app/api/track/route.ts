import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ANALYTICS_PATH = path.join(process.cwd(), "src/data/analytics.json");

type AnalyticsEvent = {
  ts: number;
  path: string;
  country: string;
  device: string;
  sessionId: string;
  referrer: string;
};

const activeSessions = new Map<string, number>();

const SESSION_TTL = 90_000;

function getDevice(ua: string): string {
  if (/mobile|android|iphone|ipad|tablet/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

function readEvents(): AnalyticsEvent[] {
  try {
    return JSON.parse(fs.readFileSync(ANALYTICS_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeEvents(events: AnalyticsEvent[]) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const pruned = events.filter((e) => e.ts > cutoff);
  fs.writeFileSync(ANALYTICS_PATH, JSON.stringify(pruned, null, 2), "utf-8");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { path?: string; sessionId?: string; referrer?: string; type?: string };
    const sessionId = body.sessionId || "anon";
    const now = Date.now();

    activeSessions.set(sessionId, now);

    if (body.type === "ping") {
      return NextResponse.json({ ok: true });
    }

    const ua = req.headers.get("user-agent") || "";
    const country = (req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || "").toUpperCase();

    const event: AnalyticsEvent = {
      ts: now,
      path: body.path || "/",
      country: country || "XX",
      device: getDevice(ua),
      sessionId,
      referrer: body.referrer || "",
    };

    const events = readEvents();
    events.push(event);
    writeEvents(events);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function GET() {
  const now = Date.now();
  const activeCount = [...activeSessions.values()].filter((t) => now - t < SESSION_TTL).size;
  return NextResponse.json({ activeNow: activeCount });
}
