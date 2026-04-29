import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "debug-84a28c.log");

// Receives NDJSON events from the client during debug sessions.
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const line = JSON.stringify(payload);
    fs.appendFileSync(LOG_PATH, `${line}\n`, "utf8");
    let size = 0;
    try {
      size = fs.statSync(LOG_PATH).size;
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: true, logPath: LOG_PATH, size });
  } catch (err) {
    console.error("[api/debug-log] write failed", err);
    return NextResponse.json(
      { error: "debug_log_failed", logPath: LOG_PATH, message: err instanceof Error ? err.message : String(err) },
      { status: 400 }
    );
  }
}

export async function GET() {
  const cwd = process.cwd();
  const logPath = LOG_PATH;
  let exists = false;
  let size = 0;
  try {
    const stat = fs.statSync(logPath);
    exists = true;
    size = stat.size;
  } catch {
    // ignore
  }
  return NextResponse.json({ cwd, logPath, exists, size });
}

