import { NextResponse } from "next/server";
import { loadAdminMessages, upsertStoredAdminMessage } from "@/lib/admin-messages-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { threadId?: string; message?: string };
    const threadId = body.threadId?.trim();
    const message = body.message?.trim();

    if (!threadId || !message) {
      return NextResponse.json({ error: "Missing threadId or message." }, { status: 400 });
    }

    const id = `reply-${Date.now()}`;
    const sentAt = new Date().toISOString();

    const threads = await loadAdminMessages();
    const thread = threads.find((entry) => entry.id === threadId);
    if (!thread) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }

    upsertStoredAdminMessage({
      ...thread,
      status: "replied",
      unreadCount: 0,
      updatedAt: sentAt,
      messages: [...thread.messages, { id, sender: "admin", content: message, timestamp: sentAt }],
    });

    return NextResponse.json({ ok: true, threadId, id, sentAt, preview: message.slice(0, 120) });
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
