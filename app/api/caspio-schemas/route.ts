import { NextResponse } from "next/server";
import { caspioFetch } from "../../../lib/caspio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await caspioFetch<unknown>("/schemas/tables");
    const raw = JSON.stringify(result);

    return NextResponse.json({
      ok: true,
      topLevelType: Array.isArray(result) ? "array" : typeof result,
      topLevelKeys: result && typeof result === "object" && !Array.isArray(result) ? Object.keys(result as Record<string, unknown>) : [],
      preview: raw.slice(0, 6000)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Caspio error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
