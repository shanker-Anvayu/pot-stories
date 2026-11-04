"use client";

type LoaderArgs = { src: string; width: number; quality?: number };

/**
 * Custom next/image loader. Unsplash URLs are resized on Unsplash's own CDN
 * (imgix), so we request exactly the width the browser needs in an
 * automatically negotiated format (AVIF/WebP). Other sources (local assets,
 * demo uploads, Supabase Storage) are served as-is; a `w` hint is appended so
 * each srcset entry is distinct and next/image knows the width was considered.
 */
export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "max");
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 75));
    return url.toString();
  }
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  const [base, hash] = src.split("#", 2);
  const withWidth = `${base}${base.includes("?") ? "&" : "?"}w=${width}`;
  return hash !== undefined ? `${withWidth}#${hash}` : withWidth;
}
