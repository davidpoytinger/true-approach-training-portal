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
    const file = searchResult.data?.find((candidate) => candidate.name === thumbName) ?? searchResult.data?.[0];
    if (!file?.fileId) return new Response("Thumbnail not found", { status: 404 });

    const caspioResponse = await caspioRawFetch(`/fileAssets/files/${file.fileId}`, { headers: { Accept: "image/jpeg" } });
    if (!caspioResponse.ok) return new Response("Unable to load thumbnail", { status: 502 });

    const headers = new Headers();
    headers.set("content-type", "image/jpeg");
    headers.set("cache-control", "public, max-age=86400, s-maxage=86400");
    const length = caspioResponse.headers.get("content-length");
    if (length) headers.set("content-length", length);
    return new Response(caspioResponse.body, { status: 200, headers });
  } catch (error) {
    console.error("Content thumbnail failed", error);
    return new Response("Unable to load thumbnail", { status: 500 });
  }
}
