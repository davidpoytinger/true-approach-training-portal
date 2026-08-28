"use client";

import { useState } from "react";

type VideoDraft = {
  id: number;
  title: string;
  note: string;
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

  function addVideo() {
    setVideos((current) => [
      ...current,
      { id: Math.max(...current.map((item) => item.id), 0) + 1, title: "", note: "" }
    ]);
  }

  function removeVideo(id: number) {
    setVideos((current) => current.filter((item) => item.id !== id));
  }

  return (
    <fieldset>
      <legend>Videos</legend>
      <div className="videoFields">
        {videos.map((video, index) => (
          <div className="videoEntry" key={video.id}>
            <div className="videoEntryHeader">
              <strong>Video {index + 1}</strong>
              {videos.length > 1 ? (
                <button className="textButton" type="button" onClick={() => removeVideo(video.id)}>
                  Remove
                </button>
              ) : null}
            </div>
            <label>
              Video file
              <input name="video" type="file" accept="video/*" />
            </label>
            <label>
              Video title
              <input
                name="videoTitle"
                type="text"
                placeholder="Example: Front View"
                defaultValue={video.title}
              />
            </label>
            <label>
              Video coach note
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
