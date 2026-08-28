import { NextResponse } from "next/server";
import { getCaspioAccessToken } from "../../../lib/caspio";

export async function GET() {
  try {
    await getCaspioAccessToken();
    return NextResponse.json({ ok: true, message: "Caspio authentication successful" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
