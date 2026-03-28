import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const SOUND_NAMES = new Set(["break_over", "end_session", "start_session", "take_break"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sound: string }> }
) {
  const { sound } = await params;

  if (!SOUND_NAMES.has(sound)) {
    return NextResponse.json({ error: "unknown sound" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "art", "Sounds", `${sound}.mp3`);

  try {
    const audio = await readFile(filePath);

    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch {
    return NextResponse.json({ error: `${sound} audio not found` }, { status: 404 });
  }
}
