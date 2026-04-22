import { NextResponse } from "next/server";
import { loadAdminReviewsFresh } from "@/lib/reviews-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reviews = await loadAdminReviewsFresh();
    return NextResponse.json(reviews, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json([], { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}
