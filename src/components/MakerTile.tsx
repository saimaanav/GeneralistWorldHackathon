"use client";
import { useState } from "react";
import { css, tile, maker } from "@/lib/proto";

/** Maker mark: the maker's real logo (favicon service) on the tinted tile, with the monogram letter as fallback. */
export default function MakerTile({ makerKey, size = 34, className }: { makerKey: string; size?: number; className?: string }) {
  const m = maker(makerKey);
  const [broken, setBroken] = useState(false);
  const src = m.domain ? `https://www.google.com/s2/favicons?domain=${m.domain}&sz=128` : "";
  const img = Math.round(size * 0.62);
  return (
    <span className={className} style={css(tile(makerKey, size), { overflow: "hidden" })} aria-label={m.name} title={m.name}>
      {src && !broken
        ? <img src={src} alt="" width={img} height={img} referrerPolicy="no-referrer" loading="lazy" onError={() => setBroken(true)} style={{ display: "block", width: img, height: img, borderRadius: Math.round(size * 0.14), objectFit: "contain" }} />
        : m.letter}
    </span>
  );
}
