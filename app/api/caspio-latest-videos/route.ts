import { NextResponse } from "next/server";
import { caspioFetch } from "../../../lib/caspio";

export const dynamic = "force-dynamic";

const SESSION_VIDEOS_TABLE_ID = "c7s9mf";

type VideoRow = {
  PK_ID?: number;
  VideoID?: number;
  SessionID: number;
  VideoFile: string;
  Title: string;
  CoachNote?: string | null;
  DisplayOrder: number;
};

type VideoResponse = { data: VideoRow[] };

export async function GET() {
  try {
    const result = await caspioFetch<VideoResponse>(
      `/tables/${SESSION_VIDEOS_TABLE_ID}/records?select=PK_ID,VideoID,SessionID,VideoFile,Title,CoachNote,DisplayOrder&orderBy=VideoID DESC&limit=10`
    );
    return NextResponse.json({ ok: true, videos: result.data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
