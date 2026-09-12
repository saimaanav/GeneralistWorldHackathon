"use client";
import { css, fill, ACCENT, STATUS_CHIP, STATUS_WORD } from "@/lib/proto";
import { DIM_META } from "@/lib/questionnaire";
import { DIMS, type Profile, type Ranked } from "@/lib/types";
import type { DrawerTarget } from "./EvidenceDrawer";

export default function DimensionBars({ ranked, on, showNumbers, profile, openDrawer }: {
  ranked: Ranked;
  on: boolean;
  showNumbers: boolean;
  profile: Profile;
  openDrawer: (t: DrawerTarget) => void;
}) {
  const model = ranked.model;
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>What the maker publishes</div>
      {DIMS.map((d, i) => {
        const r = ranked.dims[d];
        const md = model.dims[d];
        const pending = r.status === "pending";
        const pct = pending ? 100 : r.s;
        const covers = md.covers || [];
        const injectionGap = d === "tamper" && profile.flags.injectionExposure && !covers.includes("prompt_injection");
        const mono: string[] = [];
        if (r.metric) mono.push(r.metric);
        if (r.value) mono.push(r.value);
        if (!mono.length) mono.push(r.status === "missing" ? "not reported" : pending ? "awaiting verification" : r.label || "");
        if (d === "tamper" && covers.length) mono.push("covers: " + covers.join(", "));
        return (
          <div key={d} className="tint" style={css("padding:11px 12px;margin:0 -12px;border-radius:12px;border-bottom:1px solid #F5F0E7;transition:background .2s ease;")}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{DIM_META[d].label}</span>
              <span style={css(STATUS_CHIP[r.status])}>{STATUS_WORD[r.status]}</span>
              <span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{pending ? "—" : Math.round(r.s)}</span>
            </div>
            <div style={{ height: 11, borderRadius: 999, background: "#EFE7DA", marginTop: 8, overflow: "hidden" }}>
              <span style={css(fill(pct, r.status, ACCENT, on, i * 0.08))} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 7, flexWrap: "wrap", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, color: "#565064", lineHeight: 1.45 }}>{md.plain || DIM_META[d].plain}</span>
              <button
                type="button"
                onClick={() => openDrawer({ model, dim: d, evidence: md.evidence[0] })}
                style={css("background:none;border:none;padding:10px 0;margin:-10px 0;font-size:13px;font-weight:700;color:#17706B;text-decoration:underline;cursor:pointer;min-height:44px;")}
              >show me where</button>
            </div>
            {injectionGap && (
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7A5410", marginTop: 5 }}>prompt-injection testing not reported</div>
            )}
            {showNumbers && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#6E687C", marginTop: 5, overflowWrap: "anywhere" }}>
                {mono.join(" · ")}
                {md.curator_note ? " · " + md.curator_note : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
