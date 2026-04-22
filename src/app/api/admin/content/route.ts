import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";

const CONTENT_PATH = path.join(process.cwd(), "src", "data", "content.json");

export async function GET() {
  try {
    const raw = fs.readFileSync(CONTENT_PATH, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    fs.mkdirSync(path.dirname(CONTENT_PATH), { recursive: true });
    fs.writeFileSync(CONTENT_PATH, JSON.stringify(body, null, 2), "utf-8");
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
