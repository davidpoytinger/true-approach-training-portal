"use client";

import { useState } from "react";

type MediaPreviewProps = {
  src: string;
  alt: string;
  className?: string;
  kind?: "image" | "video";
  poster?: string;
};

export default function MediaPreview({ src, alt, className = "storedVideoPreview", kind = "image", poster }: MediaPreviewProps) {
  const [videoActive, setVideoActive] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  if (kind === "video") {
    if (!videoActive) {
      return (
        <button
          type="button"
          className={`storedVideoLaunch ${className}`}
          onClick={() => setVideoActive(true)}
          aria-label={`Play ${alt}`}
        >
          {poster && !posterFailed ? (
            <img src={poster} alt="" loading="lazy" decoding="async" onError={() => setPosterFailed(true)} />
          ) : (
            <span className="storedVideoFallback">Video</span>
          )}
          <span className="storedVideoPlayButton" aria-hidden="true">▶</span>
          <span className="storedVideoTapLabel">Tap to play</span>
        </button>
      );
    }

    return (
      <video
        className={className}
        controls
        playsInline
        preload="metadata"
        autoPlay
        poster={posterFailed ? undefined : poster}
        src={src}
      >
        Your browser does not support video playback.
      </video>
    );
  }

  return <img className={className} src={src} alt={alt} loading="lazy" decoding="async" />;
}
