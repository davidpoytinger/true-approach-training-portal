"use client";

import { useEffect, useState } from "react";

type MediaPreviewProps = {
  src: string;
  alt: string;
  className?: string;
  kind?: "image" | "video";
  poster?: string;
};

export default function MediaPreview({ src, alt, className = "storedVideoPreview", kind = "image", poster }: MediaPreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  async function loadVideo() {
    if (loading || blobUrl) return;
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(src, { cache: "no-store" });
      if (!response.ok) throw new Error(`Video request failed: ${response.status}`);
      const blob = await response.blob();
      if (!blob.size) throw new Error("Video response was empty");
      setBlobUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error("Unable to load video", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (kind === "video") {
    if (!blobUrl) {
      return (
        <button
          type="button"
          className={`storedVideoLaunch ${className}`}
          onClick={() => void loadVideo()}
          aria-label={`Load and play ${alt}`}
          disabled={loading}
        >
          {poster ? <img src={poster} alt="" loading="lazy" decoding="async" /> : <span className="storedVideoFallback">Video</span>}
          <span className="storedVideoPlayButton" aria-hidden="true">▶</span>
          <span className="storedVideoTapLabel">{loading ? "Loading video…" : error ? "Tap to retry" : "Tap to play"}</span>
        </button>
      );
    }

    return (
      <video className={className} controls playsInline preload="auto" autoPlay poster={poster} src={blobUrl}>
        Your browser does not support video playback.
      </video>
    );
  }

  return <img className={className} src={src} alt={alt} loading="lazy" decoding="async" />;
}
