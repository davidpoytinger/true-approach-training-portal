"use client";

type MediaPreviewProps = {
  src: string;
  alt: string;
  className?: string;
  kind?: "image" | "video";
  poster?: string;
};

export default function MediaPreview({ src, alt, className = "storedVideoPreview", kind = "image", poster }: MediaPreviewProps) {
  if (kind === "video") {
    return (
      <video
        className={className}
        controls
        playsInline
        preload="none"
        poster={poster}
        src={src}
      >
        Your browser does not support video playback.
      </video>
    );
  }

  return <img className={className} src={src} alt={alt} loading="lazy" decoding="async" />;
}
