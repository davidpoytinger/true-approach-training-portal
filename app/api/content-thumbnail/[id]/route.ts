import { caspioFetch, caspioRawFetch } from "../../../../lib/caspio";

export const dynamic = "force-dynamic";

const SESSION_VIDEOS_TABLE_ID = "c7s9mf";

type SessionVideo = { VideoID: number; VideoFile: string };
type VideoResponse = { data: SessionVideo[] };
type FileAsset = { fileId: string; name: string; fullFilePath?: string };
type FileSearchResponse = { data: FileAsset[] };

function fileName(path: string) {
  return decodeURIComponent(path.split("/").filter(Boolean).pop() ?? path);
}

function thumbnailFileName(path: string) {
  const name = fileName(path);
  const base = name.replace(/\.[^.]+$/, "");
  return `${base}-email-thumb.jpg`;
}

function imageContentType(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    bmp: "image/bmp",
    heic: "image/heic",
    heif: "image/heif"
  };
  return ext ? types[ext] : undefined;
}

async function downloadFile(fileId: string, contentType: string) {
  const caspioResponse = await caspioRawFetch(`/fileAssets/files/${fileId}`, { headers: { Accept: contentType } });
  if (!caspioResponse.ok) return null;
  const headers = new Headers();
  headers.set("content-type", contentType);
  headers.set("cache-control", "public, max-age=86400, s-maxage=86400");
  const length = caspioResponse.headers.get("content-length");
  if (length) headers.set("content-length", length);
  return new Response(caspioResponse.body, { status: 200, headers });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const videoId = Number(id);
  if (!Number.isInteger(videoId) || videoId <= 0) return new Response("Invalid content", { status: 400 });

  try {
    const recordResult = await caspioFetch<VideoResponse>(`/tables/${SESSION_VIDEOS_TABLE_ID}/records?select=VideoID,VideoFile&where=VideoID=${videoId}&limit=1`);
    const item = recordResult.data?.[0];
    if (!item?.VideoFile) return new Response("Content not found", { status: 404 });

    const thumbName = thumbnailFileName(item.VideoFile);
    const searchResult = await caspioFetch<FileSearchResponse>(`/fileAssets/files/search?name=${encodeURIComponent(thumbName)}`);
    const thumb = searchResult.data?.find((candidate) => candidate.name === thumbName) ?? searchResult.data?.[0];
    if (thumb?.fileId) {
      const response = await downloadFile(thumb.fileId, "image/jpeg");
      if (response) return response;
    }

    // Image thumbnails are generated client-side. If publishing happens before that
    // conversion finishes, fall back to the original image so email still has a preview.
    const originalName = fileName(item.VideoFile);
    const originalType = imageContentType(originalName);
    if (originalType) {
      const originalSearch = await caspioFetch<FileSearchResponse>(`/fileAssets/files/search?name=${encodeURIComponent(originalName)}`);
      const original = originalSearch.data?.find((candidate) => candidate.fullFilePath === item.VideoFile)
        ?? originalSearch.data?.find((candidate) => candidate.name === originalName)
        ?? originalSearch.data?.[0];
      if (original?.fileId) {
        const response = await downloadFile(original.fileId, originalType);
        if (response) return response;
      }
    }

    return new Response("Thumbnail not found", { status: 404 });
  } catch (error) {
    console.error("Content thumbnail failed", error);
    return new Response("Unable to load thumbnail", { status: 500 });
  }
}
