import { NextResponse } from "next/server";
import { caspioFetch } from "../../../lib/caspio";

export const dynamic = "force-dynamic";

type CaspioTable = {
  tableId: string;
  name: string;
};

type CaspioSchemaResponse = {
  data: CaspioTable[];
  pagination?: {
    totalCount?: number;
  };
};

const TARGET_TABLES = new Set([
  "TA_Users",
  "TA_Players",
  "TA_TrainingSessions",
  "TA_SessionVideos"
]);

export async function GET() {
  try {
    const result = await caspioFetch<CaspioSchemaResponse>("/schemas/tables?limit=1000");
    const allTables = result.data ?? [];
    const matches = allTables
      .filter((table) => TARGET_TABLES.has(table.name))
      .map(({ tableId, name }) => ({ tableId, name }));
    const possibleMatches = allTables
      .filter((table) => /(^TA_|player|training|sessionvideo|session_video)/i.test(table.name))
      .map(({ tableId, name }) => ({ tableId, name }));

    return NextResponse.json({
      ok: true,
      accessibleTableCount: result.pagination?.totalCount ?? allTables.length,
      tables: matches,
      possibleMatches
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Caspio error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
