import { NextResponse } from "next/server";
import { caspioFetch } from "../../../lib/caspio";
import { getCurrentCoach } from "../../../lib/coach-auth";

export const dynamic = "force-dynamic";

type UploadResponse = { data: Array<{ name: string; fileId: string; fullFilePath: string }> };

function fileName(path: string) {
  return decodeURIComponent(path.split("/").filter(Boolean).pop() ?? path);
}

function thumbnailFileName(path: string) {
  const name = fileName(path);
  const base = name.replace(/\.[^.]+$/, "");
  return `${base}-email-thumb.jpg`;
}

export async function POST(request: Request) {
  const coach = await getCurrentCoach();
  if (!coach || !coach.canAddSessions) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json() as { contentPath?: string; dataUrl?: string };
    const contentPath = String(body.contentPath ?? "");
    const dataUrl = String(body.dataUrl ?? "");
    const match = /^data:image\/jpeg;base64,(.+)$/i.exec(dataUrl);
    if (!contentPath || !match) return NextResponse.json({ ok: true });

    const bytes = Buffer.from(match[1], "base64");
    if (!bytes.length || bytes.length > 400_000) return NextResponse.json({ ok: true });

    const uploadForm = new FormData();
    uploadForm.append("Files", new Blob([bytes], { type: "image/jpeg" }), thumbnailFileName(contentPath));
    await caspioFetch<UploadResponse>("/fileAssets/files/bulk", { method: "POST", body: uploadForm });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Coach content thumbnail upload failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
