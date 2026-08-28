"use client";

import { useState } from "react";

type MediaPreviewProps = {
  src: string;
  alt: string;
  className?: string;
};

export default function MediaPreview({ src, alt, className = "storedVideoPreview" }: MediaPreviewProps) {
  const [mode, setMode] = useState<"image" | "video">("image");

  if (mode === "video") {
    return (
      <video className={className} controls preload="metadata" src={src}>
        Your browser does not support video playback.
      </video>
    );
  }

  return <img className={className} src={src} alt={alt} onError={() => setMode("video")} />;
}
