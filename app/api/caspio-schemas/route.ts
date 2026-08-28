import { NextResponse } from "next/server";
import { caspioFetch } from "../../../lib/caspio";

export const dynamic = "force-dynamic";

type CaspioTable = {
  tableId?: string;
  name?: string;
  [key: string]: unknown;
};

type CaspioSchemaResponse = {
  data?: CaspioTable[];
  [key: string]: unknown;
};

const TARGET_TABLES = new Set([
  "TA_Users",
  "TA_Players",
  "TA_TrainingSessions",
  "TA_SessionVideos"
]);

export async function GET() {
  try {
    const result = await caspioFetch<CaspioSchemaResponse>("/schemas/tables");
    const tables = Array.isArray(result.data) ? result.data : [];
    const matches = tables
      .filter((table) => table.name && TARGET_TABLES.has(table.name))
      .map(({ tableId, name }) => ({ tableId, name }));

    console.log("TRUE_APPROACH_TABLE_IDS", JSON.stringify(matches));

    return NextResponse.json({ ok: true, tables: matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Caspio error";
    console.error("CASPIO_SCHEMA_ERROR", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
