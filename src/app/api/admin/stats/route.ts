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

function readEvents(): AnalyticsEvent[] {
  try {
    return JSON.parse(fs.readFileSync(ANALYTICS_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") || "7", 10), 90);

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const events = readEvents().filter((e) => e.ts > cutoff);

  const byDay: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byDevice: Record<string, number> = {};
  const uniqueSessions = new Set<string>();

  for (let i = days - 1; i >= 0; i--) {
    const d = dayKey(Date.now() - i * 24 * 60 * 60 * 1000);
    byDay[d] = 0;
  }

  for (const e of events) {
    const d = dayKey(e.ts);
    byDay[d] = (byDay[d] || 0) + 1;
    byCountry[e.country] = (byCountry[e.country] || 0) + 1;
    byDevice[e.device] = (byDevice[e.device] || 0) + 1;
    uniqueSessions.add(e.sessionId);
  }

  const topCountries = Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([country, count]) => ({ country, count }));

  const chartData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    totalViews: events.length,
    uniqueVisitors: uniqueSessions.size,
    topCountries,
    devices: byDevice,
    chartData,
  });
}
