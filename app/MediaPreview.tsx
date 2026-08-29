"use client";

type MediaPreviewProps = {
  src: string;
  alt: string;
  className?: string;
  kind?: "image" | "video";
  poster?: string;
};

function lightweightImageSrc(src: string) {
  const match = /^\/api\/video\/(\d+)(?:\?.*)?$/.exec(src);
  return match ? `/api/content-thumbnail/${match[1]}` : src;
}

export default function MediaPreview({ src, alt, className = "storedVideoPreview", kind = "image", poster }: MediaPreviewProps) {
  if (kind === "video") {
    return (
      <video
        className={className}
        controls
        playsInline
        preload="metadata"
        poster={poster ? lightweightImageSrc(poster) : undefined}
        src={src}
        aria-label={alt}
      >
        Your browser does not support video playback.
      </video>
    );
  }

  return <img className={className} src={lightweightImageSrc(src)} alt={alt} loading="lazy" decoding="async" />;
}
