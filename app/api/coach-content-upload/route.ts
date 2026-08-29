import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentCoach } from "../../../lib/coach-auth";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 250 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/webm",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];

export async function POST(request: Request) {
  const coach = await getCurrentCoach();
  if (!coach || !coach.canAddSessions) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("session-content/")) throw new Error("Invalid upload path");
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ coachAccountId: coach.account.AccountID })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("Coach Blob upload completed", blob.pathname, tokenPayload);
      }
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Coach Blob upload authorization failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to authorize upload" }, { status: 400 });
  }
}
