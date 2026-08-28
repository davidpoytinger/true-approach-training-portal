import { NextResponse } from "next/server";
import { caspioFetch } from "../../../lib/caspio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await caspioFetch<unknown>(
      `/fileAssets/files/search?name=${encodeURIComponent("1787899399381-2-MicrosoftTeams-video__6_.mp4")}`
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
