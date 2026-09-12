"use client";
import { css, fill, ACCENT, SHORT } from "@/lib/proto";
import { DIMS, type DimKey, type DimResult } from "@/lib/types";
import { DIM_META } from "@/lib/questionnaire";

export default function MiniBars({ dims, on }: { dims: Record<DimKey, DimResult>; on: boolean }) {
  return (
    <span style={{ marginLeft: "auto", display: "flex", gap: 12, flexWrap: "wrap" }}>
      {DIMS.map((d, i) => {
        const r = dims[d];
        const pct = r.status === "pending" ? 100 : r.s;
        return (
          <span key={d} style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }} title={DIM_META[d].label + (r.status === "pending" ? ": still checking" : ": " + Math.round(r.s) + " out of 100")}>
            <span style={{ width: 52, height: 9, borderRadius: 999, background: "#EFE7DA", overflow: "hidden" }}>
              <span style={css(fill(pct, r.status, ACCENT, on, i * 0.06))} />
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#565064" }}>{SHORT[d]}</span>
          </span>
        );
      })}
    </span>
  );
}
