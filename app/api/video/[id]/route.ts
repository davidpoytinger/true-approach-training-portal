import { NextRequest } from "next/server";
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

function fallbackContentType(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    avif: "image/avif",
    bmp: "image/bmp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    mov: "video/quicktime",
    mp4: "video/mp4",
    m4v: "video/x-m4v",
    webm: "video/webm",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
  return extension ? types[extension] ?? "application/octet-stream" : "application/octet-stream";
}

function parseRange(rangeHeader: string, totalLength: number) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) return null;
  let start: number;
  let end: number;
  if (match[1]) {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : totalLength - 1;
  } else if (match[2]) {
    const suffixLength = Number(match[2]);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(totalLength - suffixLength, 0);
    end = totalLength - 1;
  } else {
    return null;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= totalLength || end < start) return null;
  end = Math.min(end, totalLength - 1);
  return { start, end };
}

function sliceReadableStream(source: ReadableStream<Uint8Array>, start: number, end: number) {
  const reader = source.getReader();
  let sourceOffset = 0;
  let done = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (done) { controller.close(); return; }
      while (true) {
        const result = await reader.read();
        if (result.done) { done = true; controller.close(); return; }
        const chunk = result.value;
        const chunkStart = sourceOffset;
        const chunkEnd = sourceOffset + chunk.byteLength - 1;
        sourceOffset += chunk.byteLength;
        if (chunkEnd < start) continue;
        if (chunkStart > end) { done = true; await reader.cancel(); controller.close(); return; }
        const from = Math.max(start - chunkStart, 0);
        const to = Math.min(end - chunkStart + 1, chunk.byteLength);
        if (to > from) controller.enqueue(chunk.subarray(from, to));
        if (chunkEnd >= end) { done = true; await reader.cancel(); controller.close(); }
        return;
      }
    },
    async cancel() { done = true; await reader.cancel(); }
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const videoId = Number(id);
  if (!Number.isInteger(videoId) || videoId <= 0) return new Response("Invalid content", { status: 400 });

  try {
    const recordResult = await caspioFetch<VideoResponse>(`/tables/${SESSION_VIDEOS_TABLE_ID}/records?select=VideoID,VideoFile&where=VideoID=${videoId}&limit=1`);
    const video = recordResult.data?.[0];
    if (!video?.VideoFile) return new Response("Content not found", { status: 404 });

    const name = fileName(video.VideoFile);
    const searchResult = await caspioFetch<FileSearchResponse>(`/fileAssets/files/search?name=${encodeURIComponent(name)}`);
    const file = searchResult.data?.find((item) => item.fullFilePath === video.VideoFile)
      ?? searchResult.data?.find((item) => item.name === name)
      ?? searchResult.data?.[0];
    if (!file?.fileId) return new Response("Stored file not found", { status: 404 });

    const range = request.headers.get("range");
    const caspioResponse = await caspioRawFetch(`/fileAssets/files/${file.fileId}`, {
      headers: { Accept: "*/*", ...(range ? { Range: range } : {}) }
    });

    if (!caspioResponse.ok && caspioResponse.status !== 206) {
      const details = await caspioResponse.text();
      console.error("Caspio content download failed", caspioResponse.status, details);
      return new Response("Unable to load content", { status: 502 });
    }

    const headers = new Headers();
    const passthrough = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];
    for (const key of passthrough) {
      const value = caspioResponse.headers.get(key);
      if (value) headers.set(key, value);
    }

    const inferredType = fallbackContentType(name);
    const caspioType = headers.get("content-type")?.toLowerCase() ?? "";
    if (!caspioType || caspioType === "application/octet-stream" || caspioType === "binary/octet-stream") {
      headers.set("content-type", inferredType);
    }

    headers.set("accept-ranges", "bytes");
    headers.set("cache-control", "private, max-age=300");

    if (caspioResponse.status === 206 || !range) {
      return new Response(caspioResponse.body, { status: caspioResponse.status, headers });
    }

    const totalLength = Number(caspioResponse.headers.get("content-length"));
    if (!Number.isFinite(totalLength) || totalLength <= 0 || !caspioResponse.body) {
      return new Response(caspioResponse.body, { status: 200, headers });
    }

    const parsedRange = parseRange(range, totalLength);
    if (!parsedRange) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${totalLength}`, "accept-ranges": "bytes" } });
    }

    const { start, end } = parsedRange;
    headers.set("content-range", `bytes ${start}-${end}/${totalLength}`);
    headers.set("content-length", String(end - start + 1));
    return new Response(sliceReadableStream(caspioResponse.body, start, end), { status: 206, headers });
  } catch (error) {
    console.error("Content preview failed", error);
    return new Response("Unable to load content", { status: 500 });
  }
}
