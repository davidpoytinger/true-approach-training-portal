"use client";

import { useEffect, useState } from "react";

type ContentDraft = {
  id: number;
  title: string;
  note: string;
  previewUrl?: string;
  fileName?: string;
  fileType?: string;
  uploadedPath?: string;
  uploadStatus?: "idle" | "uploading" | "ready" | "error";
  uploadError?: string;
};

const MAX_FILE_BYTES = 3_800_000;

function isDocument(file?: File) {
  if (!file) return false;
  return file.type === "application/pdf" || /\.(doc|docx|pdf|ppt|pptx|xls|xlsx)$/i.test(file.name);
}

function documentLabel(fileName?: string) {
  const extension = fileName?.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 5 ? extension : "DOC";
}

function renderJpeg(source: CanvasImageSource, sourceWidth: number, sourceHeight: number) {
  const maxWidth = 560;
  const scale = Math.min(1, maxWidth / sourceWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL("image/jpeg", 0.82);
  return data.length <= 350000 ? data : canvas.toDataURL("image/jpeg", 0.68);
}

async function createImageThumbnail(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const cleanup = () => URL.revokeObjectURL(url);
    image.onload = () => {
      const data = renderJpeg(image, image.naturalWidth || 1200, image.naturalHeight || 800);
      cleanup();
      resolve(data);
    };
    image.onerror = () => {
      cleanup();
      resolve(undefined);
    };
    image.src = url;
  });
}

async function createVideoThumbnail(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    const fail = () => {
      cleanup();
      resolve(undefined);
    };

    video.onerror = fail;
    video.onloadedmetadata = () => {
      const target = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(0.75, Math.max(0.1, video.duration * 0.1)) : 0.1;
      try { video.currentTime = target; } catch { fail(); }
    };

    video.onseeked = () => {
      try {
        const data = renderJpeg(video, video.videoWidth || 1280, video.videoHeight || 720);
        cleanup();
        resolve(data);
      } catch { fail(); }
    };

    video.src = url;
  });
}

async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file, file.name);
  const response = await fetch("/api/coach-content-upload", { method: "POST", body: formData });
  const result = await response.json().catch(() => ({})) as { path?: string; error?: string };
  if (!response.ok || !result.path) throw new Error(result.error || "Unable to upload this file");
  return result.path;
}

async function uploadThumbnail(contentPath: string, dataUrl?: string) {
  if (!dataUrl) return;
  await fetch("/api/coach-content-thumbnail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentPath, dataUrl })
  }).catch(() => undefined);
}

export default function VideoFields({ initialTitles = [""], initialNotes = [""], initialPaths = [], initialFileNames = [] }: { initialTitles?: string[]; initialNotes?: string[]; initialPaths?: string[]; initialFileNames?: string[] }) {
  const initialCount = Math.max(1, initialTitles.length, initialNotes.length, initialPaths.length, initialFileNames.length);
  const [content, setContent] = useState<ContentDraft[]>(Array.from({ length: initialCount }, (_, index) => ({
    id: index + 1,
    title: initialTitles[index] ?? "",
    note: initialNotes[index] ?? "",
    uploadedPath: initialPaths[index] || undefined,
    fileName: initialFileNames[index] || undefined,
    uploadStatus: initialPaths[index] ? "ready" : "idle"
  })));
  const [formError, setFormError] = useState("");

  useEffect(() => () => { content.forEach((item) => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); }); }, [content]);

  useEffect(() => {
    const form = document.querySelector("form.form");
    if (!form) return;
    const handler = (event: Event) => {
      if (content.some((item) => item.uploadStatus === "uploading")) {
        event.preventDefault();
        setFormError("Please wait for all content uploads to finish before publishing the session.");
      } else if (content.some((item) => item.uploadStatus === "error")) {
        event.preventDefault();
        setFormError("Please fix or remove the content item with an upload error before publishing the session.");
      }
    };
    form.addEventListener("submit", handler);
    return () => form.removeEventListener("submit", handler);
  }, [content]);

  function addContent() { setContent((current) => [...current, { id: Math.max(...current.map((item) => item.id), 0) + 1, title: "", note: "", uploadStatus: "idle" }]); }
  function removeContent(id: number) { setContent((current) => { const removed = current.find((item) => item.id === id); if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl); return current.filter((item) => item.id !== id); }); setFormError(""); }

  async function selectContent(id: number, file?: File) {
    setFormError("");
    setContent((current) => current.map((item) => {
      if (item.id !== id) return item;
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      if (!file) return { ...item, previewUrl: undefined, fileName: undefined, fileType: undefined, uploadedPath: undefined, uploadStatus: "idle", uploadError: undefined };
      return { ...item, previewUrl: URL.createObjectURL(file), fileName: file.name, fileType: file.type, uploadedPath: undefined, uploadStatus: "uploading", uploadError: undefined };
    }));

    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setContent((current) => current.map((item) => item.id === id ? { ...item, uploadStatus: "error", uploadError: "This file is too large. Please trim or compress it below 3.8 MB and select it again." } : item));
      return;
    }

    try {
      const thumbnailPromise = file.type.startsWith("video/") ? createVideoThumbnail(file) : file.type.startsWith("image/") ? createImageThumbnail(file) : Promise.resolve(undefined);
      const path = await uploadFile(file);
      const thumbnail = await thumbnailPromise;
      await uploadThumbnail(path, thumbnail);
      setContent((current) => current.map((item) => item.id === id && item.fileName === file.name ? { ...item, uploadedPath: path, uploadStatus: "ready", uploadError: undefined } : item));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload this file";
      setContent((current) => current.map((item) => item.id === id ? { ...item, uploadedPath: undefined, uploadStatus: "error", uploadError: message } : item));
    }
  }

  return (
    <fieldset>
      <legend>Content</legend>
      {formError ? <p className="errorBanner">{formError}</p> : null}
      <div className="videoFields">
        {content.map((item) => {
          const document = item.fileName ? isDocument(new File([], item.fileName, { type: item.fileType })) : false;
          return <div className="videoEntry" key={item.id}>
            {content.length > 1 ? <div className="videoEntryHeader"><span /><button className="textButton" type="button" onClick={() => removeContent(item.id)}>Remove</button></div> : null}
            <label>Content File<input type="file" accept="video/*,image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" onChange={(event) => void selectContent(item.id, event.target.files?.[0])} /></label>
            <input type="hidden" name="videoPath" value={item.uploadedPath ?? ""} />
            <input type="hidden" name="videoOriginalName" value={item.fileName ?? ""} />
            {item.previewUrl ? <div className="videoPreviewWrap">
              {item.fileType?.startsWith("image/") ? <img className="videoPreview" src={item.previewUrl} alt={item.title || item.fileName || "Content preview"} /> : document ? <div className="documentPreview"><div className="documentIcon">{documentLabel(item.fileName)}</div><span className="videoPreviewName">{item.fileName}</span></div> : <video className="videoPreview" src={item.previewUrl} controls preload="metadata" playsInline />}
              {!document ? <span className="videoPreviewName">{item.fileName}</span> : null}
            </div> : item.uploadedPath && item.fileName ? <div className="documentPreview"><div className="documentIcon">✓</div><span className="videoPreviewName">{item.fileName}</span></div> : null}
            {item.uploadStatus === "uploading" ? <div className="muted">Uploading content…</div> : null}
            {item.uploadStatus === "ready" ? <div className="muted">Upload complete. Ready to publish.</div> : null}
            {item.uploadStatus === "error" ? <div className="errorBanner">{item.uploadError || "Upload failed. Please select the file again."}</div> : null}
            <label>Content Title<input name="videoTitle" type="text" placeholder="Example: Front View" defaultValue={item.title} /></label>
            <label>Content Coach Note<textarea name="videoNote" rows={3} placeholder="Optional note for this content" defaultValue={item.note} /></label>
          </div>;
        })}
      </div>
      <button className="button secondary addVideoButton" type="button" onClick={addContent}>+ Add Another Content Item</button>
    </fieldset>
  );
}
