"use client";

import { useEffect, useState } from "react";

type VideoDraft = {
  id: number;
  title: string;
  note: string;
  previewUrl?: string;
  fileName?: string;
};

export default function VideoFields({
  initialTitles = [""],
  initialNotes = [""]
}: {
  initialTitles?: string[];
  initialNotes?: string[];
}) {
  const initialCount = Math.max(1, initialTitles.length, initialNotes.length);
  const [videos, setVideos] = useState<VideoDraft[]>(
    Array.from({ length: initialCount }, (_, index) => ({
      id: index + 1,
      title: initialTitles[index] ?? "",
      note: initialNotes[index] ?? ""
    }))
  );

  useEffect(() => {
    return () => {
      videos.forEach((video) => {
        if (video.previewUrl) URL.revokeObjectURL(video.previewUrl);
      });
    };
  }, [videos]);

  function addVideo() {
    setVideos((current) => [
      ...current,
      { id: Math.max(...current.map((item) => item.id), 0) + 1, title: "", note: "" }
    ]);
  }

  function removeVideo(id: number) {
    setVideos((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function selectVideo(id: number, file?: File) {
    setVideos((current) =>
      current.map((video) => {
        if (video.id !== id) return video;
        if (video.previewUrl) URL.revokeObjectURL(video.previewUrl);
        if (!file) return { ...video, previewUrl: undefined, fileName: undefined };
        return {
          ...video,
          previewUrl: URL.createObjectURL(file),
          fileName: file.name
        };
      })
    );
  }

  return (
    <fieldset>
      <legend>Videos</legend>
      <div className="videoFields">
        {videos.map((video) => (
          <div className="videoEntry" key={video.id}>
            {videos.length > 1 ? (
              <div className="videoEntryHeader">
                <span />
                <button className="textButton" type="button" onClick={() => removeVideo(video.id)}>
                  Remove
                </button>
              </div>
            ) : null}
            <label>
              Video File
              <input
                name="video"
                type="file"
                accept="video/*"
                onChange={(event) => selectVideo(video.id, event.target.files?.[0])}
              />
            </label>
            {video.previewUrl ? (
              <div className="videoPreviewWrap">
                <video
                  className="videoPreview"
                  src={video.previewUrl}
                  controls
                  preload="metadata"
                  playsInline
                />
                <span className="videoPreviewName">{video.fileName}</span>
              </div>
            ) : null}
            <label>
              Video Title
              <input
                name="videoTitle"
                type="text"
                placeholder="Example: Front View"
                defaultValue={video.title}
              />
            </label>
            <label>
              Video Coach Note
              <textarea
                name="videoNote"
                rows={3}
                placeholder="Optional note for this video"
                defaultValue={video.note}
              />
            </label>
          </div>
        ))}
      </div>
      <button className="button secondary addVideoButton" type="button" onClick={addVideo}>
        + Add Another Video
      </button>
    </fieldset>
  );
}
