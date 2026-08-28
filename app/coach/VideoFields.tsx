"use client";

import { useEffect, useState } from "react";

type ContentDraft = {
  id: number;
  title: string;
  note: string;
  previewUrl?: string;
  fileName?: string;
  fileType?: string;
  emailThumbnailData?: string;
};

function isDocument(file?: File) {
  if (!file) return false;
  return file.type === "application/pdf" || /\.(doc|docx|pdf|ppt|pptx|xls|xlsx)$/i.test(file.name);
}

function documentLabel(fileName?: string) {
  const extension = fileName?.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 5 ? extension : "DOC";
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
      try {
        video.currentTime = target;
      } catch {
        fail();
      }
    };

    video.onseeked = () => {
      try {
        const sourceWidth = video.videoWidth || 1280;
        const sourceHeight = video.videoHeight || 720;
        const maxWidth = 640;
        const scale = Math.min(1, maxWidth / sourceWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(sourceWidth * scale));
        canvas.height = Math.max(1, Math.round(sourceHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) return fail();
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.78);
        cleanup();
        resolve(data);
      } catch {
        fail();
      }
    };

    video.src = url;
  });
}

export default function VideoFields({ initialTitles = [""], initialNotes = [""] }: { initialTitles?: string[]; initialNotes?: string[] }) {
  const initialCount = Math.max(1, initialTitles.length, initialNotes.length);
  const [content, setContent] = useState<ContentDraft[]>(Array.from({ length: initialCount }, (_, index) => ({ id: index + 1, title: initialTitles[index] ?? "", note: initialNotes[index] ?? "" })));

  useEffect(() => () => { content.forEach((item) => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); }); }, [content]);

  function addContent() { setContent((current) => [...current, { id: Math.max(...current.map((item) => item.id), 0) + 1, title: "", note: "" }]); }
  function removeContent(id: number) { setContent((current) => { const removed = current.find((item) => item.id === id); if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl); return current.filter((item) => item.id !== id); }); }
  async function selectContent(id: number, file?: File) {
    setContent((current) => current.map((item) => {
      if (item.id !== id) return item;
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      if (!file) return { ...item, previewUrl: undefined, fileName: undefined, fileType: undefined, emailThumbnailData: undefined };
      return { ...item, previewUrl: URL.createObjectURL(file), fileName: file.name, fileType: file.type, emailThumbnailData: undefined };
    }));

    if (file?.type.startsWith("video/")) {
      const thumbnail = await createVideoThumbnail(file);
      if (thumbnail) {
        setContent((current) => current.map((item) => item.id === id && item.fileName === file.name ? { ...item, emailThumbnailData: thumbnail } : item));
      }
    }
  }

  return (
    <fieldset>
      <legend>Content</legend>
      <div className="videoFields">
        {content.map((item) => {
          const document = item.fileName ? isDocument(new File([], item.fileName, { type: item.fileType })) : false;
          return <div className="videoEntry" key={item.id}>
            {content.length > 1 ? <div className="videoEntryHeader"><span /><button className="textButton" type="button" onClick={() => removeContent(item.id)}>Remove</button></div> : null}
            <label>Content File<input name="video" type="file" accept="video/*,image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" onChange={(event) => void selectContent(item.id, event.target.files?.[0])} /></label>
            <input type="hidden" name="videoThumbnailData" value={item.emailThumbnailData ?? ""} />
            {item.previewUrl ? <div className="videoPreviewWrap">
              {item.fileType?.startsWith("image/") ? <img className="videoPreview" src={item.previewUrl} alt={item.title || item.fileName || "Content preview"} /> : document ? <div className="documentPreview"><div className="documentIcon">{documentLabel(item.fileName)}</div><span className="videoPreviewName">{item.fileName}</span></div> : <video className="videoPreview" src={item.previewUrl} controls preload="metadata" playsInline />}
              {!document ? <span className="videoPreviewName">{item.fileName}</span> : null}
            </div> : null}
            <label>Content Title<input name="videoTitle" type="text" placeholder="Example: Front View" defaultValue={item.title} /></label>
            <label>Content Coach Note<textarea name="videoNote" rows={3} placeholder="Optional note for this content" defaultValue={item.note} /></label>
          </div>;
        })}
      </div>
      <button className="button secondary addVideoButton" type="button" onClick={addContent}>+ Add Another Content Item</button>
    </fieldset>
  );
}
