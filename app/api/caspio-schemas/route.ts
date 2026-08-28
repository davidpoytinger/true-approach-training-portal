import { NextResponse } from "next/server";
import { caspioFetch } from "../../../lib/caspio";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await caspioFetch<unknown>("/schemas/tables");
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Caspio error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
