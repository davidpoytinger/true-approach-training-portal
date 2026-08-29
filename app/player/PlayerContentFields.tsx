"use client";

import { upload } from "@vercel/blob/client";
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
  uploadProgress?: number;
};

const MAX_FILE_BYTES = 250 * 1024 * 1024;

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function PlayerContentFields({
  initialTitles = [""],
  initialNotes = [""]
}: {
  initialTitles?: string[];
  initialNotes?: string[];
}) {
  const initialCount = Math.max(1, initialTitles.length, initialNotes.length);
  const [content, setContent] = useState<ContentDraft[]>(
    Array.from({ length: initialCount }, (_, index) => ({
      id: index + 1,
      title: initialTitles[index] ?? "",
      note: initialNotes[index] ?? "",
      uploadStatus: "idle",
      uploadProgress: 0
    }))
  );
  const [formError, setFormError] = useState("");

  useEffect(() => () => {
    content.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  }, [content]);

  useEffect(() => {
    const form = document.querySelector("form.form");
    if (!form) return;
    const handler = (event: Event) => {
      if (content.some((item) => item.uploadStatus === "uploading")) {
        event.preventDefault();
        setFormError("Please wait for all content uploads to finish before saving the session.");
      } else if (content.some((item) => item.uploadStatus === "error")) {
        event.preventDefault();
        setFormError("Please fix or remove the content item with an upload error before saving the session.");
      }
    };
    form.addEventListener("submit", handler);
    return () => form.removeEventListener("submit", handler);
  }, [content]);

  function addContent() {
    setContent((current) => [
      ...current,
      { id: Math.max(...current.map((item) => item.id), 0) + 1, title: "", note: "", uploadStatus: "idle", uploadProgress: 0 }
    ]);
  }

  function removeContent(id: number) {
    setContent((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
    setFormError("");
  }

  async function selectContent(id: number, file?: File) {
    setFormError("");
    setContent((current) => current.map((item) => {
      if (item.id !== id) return item;
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      if (!file) return { ...item, previewUrl: undefined, fileName: undefined, fileType: undefined, uploadedPath: undefined, uploadStatus: "idle", uploadError: undefined, uploadProgress: 0 };
      return { ...item, previewUrl: URL.createObjectURL(file), fileName: file.name, fileType: file.type, uploadedPath: undefined, uploadStatus: "uploading", uploadError: undefined, uploadProgress: 0 };
    }));
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setContent((current) => current.map((item) => item.id === id ? { ...item, uploadStatus: "error", uploadError: "This file is larger than the 250 MB upload limit.", uploadProgress: 0 } : item));
      return;
    }

    try {
      const pathname = `session-content/${Date.now()}-${safeFileName(file.name)}`;
      const blob = await upload(pathname, file, {
        access: "private",
        handleUploadUrl: "/api/player-content-upload",
        contentType: file.type || undefined,
        multipart: true,
        onUploadProgress: ({ percentage }) => {
          setContent((current) => current.map((item) => item.id === id && item.fileName === file.name ? { ...item, uploadProgress: Math.round(percentage) } : item));
        }
      });
      setContent((current) => current.map((item) => item.id === id && item.fileName === file.name ? { ...item, uploadedPath: blob.pathname, uploadStatus: "ready", uploadError: undefined, uploadProgress: 100 } : item));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload this file";
      setContent((current) => current.map((item) => item.id === id ? { ...item, uploadedPath: undefined, uploadStatus: "error", uploadError: message, uploadProgress: 0 } : item));
    }
  }

  return (
    <fieldset>
      <legend>Content</legend>
      <p className="muted">Videos can be up to 250 MB each. Files upload directly and can be added one after another.</p>
      {formError ? <p className="errorBanner">{formError}</p> : null}
      <div className="videoFields">
        {content.map((item) => (
          <div className="videoEntry" key={item.id}>
            {content.length > 1 ? (
              <div className="videoEntryHeader">
                <span />
                <button className="textButton" type="button" onClick={() => removeContent(item.id)}>Remove</button>
              </div>
            ) : null}
            <label>
              Content File
              <input
                type="file"
                accept="video/*,image/*"
                onChange={(event) => void selectContent(item.id, event.target.files?.[0])}
              />
            </label>
            <input type="hidden" name="videoPath" value={item.uploadedPath ?? ""} />
            <input type="hidden" name="videoOriginalName" value={item.fileName ?? ""} />
            {item.previewUrl ? (
              <div className="videoPreviewWrap">
                {item.fileType?.startsWith("image/") ? (
                  <img className="videoPreview" src={item.previewUrl} alt={item.fileName || "Content preview"} />
                ) : (
                  <video className="videoPreview" src={item.previewUrl} controls preload="metadata" playsInline />
                )}
                <span className="videoPreviewName">{item.fileName}</span>
              </div>
            ) : null}
            {item.uploadStatus === "uploading" ? <div className="muted">Uploading content… {item.uploadProgress ?? 0}%</div> : null}
            {item.uploadStatus === "ready" ? <div className="muted">Upload complete. Ready to save.</div> : null}
            {item.uploadStatus === "error" ? <div className="errorBanner">{item.uploadError || "Upload failed. Please select the file again."}</div> : null}
            <label>Content Title<input name="videoTitle" type="text" placeholder="Example: Front View" defaultValue={item.title} /></label>
            <label>Your Note<textarea name="videoNote" rows={3} placeholder="Optional note about this content" defaultValue={item.note} /></label>
          </div>
        ))}
      </div>
      <button className="button secondary addVideoButton" type="button" onClick={addContent}>+ Add Another Content Item</button>
    </fieldset>
  );
}
