import { NextResponse } from "next/server";
import { caspioFetch } from "../../../lib/caspio";

export const dynamic = "force-dynamic";

const SESSIONS_TABLE_ID = "o1u972";

type TrainingSession = {
  SessionID: number;
  PlayerID: number;
  SessionDate: string;
  Title: string;
  CoachNotes?: string | null;
  Status: string;
  PublishedAt?: string | null;
  CreatedAt?: string | null;
};

type SessionResponse = {
  data: TrainingSession[];
};

export async function GET() {
  try {
    const result = await caspioFetch<SessionResponse>(
      `/tables/${SESSIONS_TABLE_ID}/records?select=SessionID,PlayerID,SessionDate,Title,CoachNotes,Status,PublishedAt,CreatedAt&orderBy=SessionID DESC&limit=5`
    );

    return NextResponse.json({ ok: true, sessions: result.data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Caspio error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
