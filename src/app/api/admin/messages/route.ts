import { NextRequest, NextResponse } from "next/server";
import { loadAdminMessages, upsertStoredAdminMessage } from "@/lib/admin-messages-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const messages = await loadAdminMessages();
    return NextResponse.json(messages, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json([], { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = (await req.json()) as { id?: string; status?: "new" | "open" | "replied" };
    if (!id || !status) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const messages = await loadAdminMessages();
    const thread = messages.find((entry) => entry.id === id);
    if (!thread) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    upsertStoredAdminMessage({
      ...thread,
      status,
      unreadCount: status === "new" ? thread.unreadCount : 0,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
