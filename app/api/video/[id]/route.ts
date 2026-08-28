import { NextRequest } from "next/server";
import { caspioFetch, caspioRawFetch } from "../../../../lib/caspio";

export const dynamic = "force-dynamic";

const SESSION_VIDEOS_TABLE_ID = "c7s9mf";

type SessionVideo = {
  VideoID: number;
  VideoFile: string;
};

type VideoResponse = { data: SessionVideo[] };
type FileAsset = {
  fileId: string;
  name: string;
  fullFilePath?: string;
};
type FileSearchResponse = { data: FileAsset[] };

function fileName(path: string) {
  return decodeURIComponent(path.split("/").filter(Boolean).pop() ?? path);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const videoId = Number(id);
  if (!Number.isInteger(videoId) || videoId <= 0) return new Response("Invalid video", { status: 400 });

  try {
    const recordResult = await caspioFetch<VideoResponse>(
      `/tables/${SESSION_VIDEOS_TABLE_ID}/records?select=VideoID,VideoFile&where=VideoID=${videoId}&limit=1`
    );
    const video = recordResult.data?.[0];
    if (!video?.VideoFile) return new Response("Video not found", { status: 404 });

    const name = fileName(video.VideoFile);
    const searchResult = await caspioFetch<FileSearchResponse>(
      `/fileAssets/files/search?name=${encodeURIComponent(name)}`
    );

    const file = searchResult.data?.find((item) => item.fullFilePath === video.VideoFile)
      ?? searchResult.data?.find((item) => item.name === name)
      ?? searchResult.data?.[0];

    if (!file?.fileId) return new Response("Stored file not found", { status: 404 });

    const range = request.headers.get("range");
    const caspioResponse = await caspioRawFetch(`/fileAssets/files/${file.fileId}`, {
      headers: {
        Accept: "*/*",
        ...(range ? { Range: range } : {})
      }
    });

    if (!caspioResponse.ok && caspioResponse.status !== 206) {
      const details = await caspioResponse.text();
      console.error("Caspio video download failed", caspioResponse.status, details);
      return new Response("Unable to load video", { status: 502 });
    }

    const headers = new Headers();
    const passthrough = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];
    for (const key of passthrough) {
      const value = caspioResponse.headers.get(key);
      if (value) headers.set(key, value);
    }
    if (!headers.has("content-type")) headers.set("content-type", "video/mp4");
    headers.set("cache-control", "private, max-age=300");

    return new Response(caspioResponse.body, {
      status: caspioResponse.status,
      headers
    });
  } catch (error) {
    console.error("Video preview failed", error);
    return new Response("Unable to load video", { status: 500 });
  }
}
