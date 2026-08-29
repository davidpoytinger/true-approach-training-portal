import { NextResponse } from "next/server";
import { caspioFetch } from "../../../lib/caspio";
import { getCurrentCoach } from "../../../lib/coach-auth";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 3_800_000;

type UploadResponse = { data: Array<{ name: string; fileId: string; fullFilePath: string }> };

function uniqueFileName(originalName: string) {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
}

export async function POST(request: Request) {
  const coach = await getCurrentCoach();
  if (!coach || !coach.canAddSessions) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4_100_000) return NextResponse.json({ error: "File is too large" }, { status: 413 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "No file selected" }, { status: 400 });
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "File is too large" }, { status: 413 });

    const uploadForm = new FormData();
    uploadForm.append("Files", file, uniqueFileName(file.name));
    const uploaded = await caspioFetch<UploadResponse>("/fileAssets/files/bulk", { method: "POST", body: uploadForm });
    const fullFilePath = uploaded.data?.[0]?.fullFilePath;
    if (!fullFilePath) throw new Error("Caspio did not return a file path");

    return NextResponse.json({ path: fullFilePath, name: file.name });
  } catch (error) {
    console.error("Coach content upload failed", error);
    return NextResponse.json({ error: "Unable to upload this file" }, { status: 500 });
  }
}
