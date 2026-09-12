"use client";
import { useEffect, useState } from "react";
import MakerTile from "./MakerTile";
import { ACCENT, css } from "@/lib/proto";

export interface StackRow { id: string; name: string; makerKey: string; published: number; described: number; silent: number }

const SEG_COLOR = [ACCENT, "#F0C878", "#E8B7AB"];

export default function StackedCoverage({ rows }: { rows: StackRow[] }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 120);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={css("background:#FFFFFF;border-radius:22px;padding:24px 26px;box-shadow:0 12px 26px rgba(22,21,28,.05);")}>
      {rows.map((s, i) => {
        const segs = [s.published, s.described, s.silent];
        return (
          <div
            key={s.id}
            className="tint-row"
            style={css("display:flex;flex-wrap:wrap;align-items:center;row-gap:8px;column-gap:14px;padding:7px 12px;margin:0 -12px;border-radius:12px;transition:background .2s ease, transform .2s ease;")}
          >
            <MakerTile makerKey={s.makerKey} size={26} />
            <span style={css("flex:0 1 150px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600;")}>{s.name}</span>
            {/* The bar keeps a real minimum width; on a phone it wraps onto its own line with the number rather than shrinking to nothing. */}
            <span
              style={css("flex:1 1 200px;min-width:160px;display:flex;height:20px;border-radius:999px;overflow:hidden;background:#F3EEE4;")}
              role="img"
              aria-label={s.published + "% published, " + s.described + "% described, " + s.silent + "% silent"}
            >
              {segs.map((v, j) => (
                <span key={j} style={css("display:block;height:100%;transition:width .9s cubic-bezier(.34,1.1,.64,1) " + (i * 0.06 + j * 0.05) + "s;width:" + (on ? v : 0) + "%;background:" + SEG_COLOR[j] + ";")} />
              ))}
            </span>
            <span style={css("flex:0 0 44px;text-align:right;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;")}>{s.published}%</span>
          </div>
        );
      })}
    </div>
  );
}
