"use client";

import { useEffect, useState } from "react";

type ContentDraft = {
  id: number;
  title: string;
  note: string;
  previewUrl?: string;
  fileName?: string;
  fileType?: string;
};

function isDocument(file?: File) {
  if (!file) return false;
  return file.type === "application/pdf" || /\.(doc|docx|pdf|ppt|pptx|xls|xlsx)$/i.test(file.name);
}

function documentLabel(fileName?: string) {
  const extension = fileName?.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 5 ? extension : "DOC";
}

export default function VideoFields({ initialTitles = [""], initialNotes = [""] }: { initialTitles?: string[]; initialNotes?: string[] }) {
  const initialCount = Math.max(1, initialTitles.length, initialNotes.length);
  const [content, setContent] = useState<ContentDraft[]>(Array.from({ length: initialCount }, (_, index) => ({ id: index + 1, title: initialTitles[index] ?? "", note: initialNotes[index] ?? "" })));

  useEffect(() => () => { content.forEach((item) => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); }); }, [content]);

  function addContent() { setContent((current) => [...current, { id: Math.max(...current.map((item) => item.id), 0) + 1, title: "", note: "" }]); }
  function removeContent(id: number) { setContent((current) => { const removed = current.find((item) => item.id === id); if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl); return current.filter((item) => item.id !== id); }); }
  function selectContent(id: number, file?: File) { setContent((current) => current.map((item) => { if (item.id !== id) return item; if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); if (!file) return { ...item, previewUrl: undefined, fileName: undefined, fileType: undefined }; return { ...item, previewUrl: URL.createObjectURL(file), fileName: file.name, fileType: file.type }; })); }

  return (
    <fieldset>
      <legend>Content</legend>
      <div className="videoFields">
        {content.map((item) => {
          const document = item.fileName ? isDocument(new File([], item.fileName, { type: item.fileType })) : false;
          return <div className="videoEntry" key={item.id}>
            {content.length > 1 ? <div className="videoEntryHeader"><span /><button className="textButton" type="button" onClick={() => removeContent(item.id)}>Remove</button></div> : null}
            <label>Content File<input name="video" type="file" accept="video/*,image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" onChange={(event) => selectContent(item.id, event.target.files?.[0])} /></label>
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
