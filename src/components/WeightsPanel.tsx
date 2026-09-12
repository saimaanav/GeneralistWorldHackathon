"use client";
import { useState } from "react";
import { css, ACCENT } from "@/lib/proto";
import { DIM_META } from "@/lib/questionnaire";
import { DIMS, type DeltaNote, type DimKey } from "@/lib/types";

const PANEL_LABEL: Record<DimKey, string> = {
  performance: "Good at the work",
  truthfulness: "Gets things right",
  privacy: "Keeps data private",
  fairness: "Treats people fairly",
  tamper: "Hard to trick",
};

export default function WeightsPanel({ weights, notes, on }: { weights: Record<DimKey, number>; notes: DeltaNote[]; on: boolean }) {
  const [open, setOpen] = useState(false);
  const order = [...DIMS].sort((a, b) => weights[b] - weights[a]);
  const max = weights[order[0]] || 1;
  return (
    <div style={{ flex: "0 1 300px", minWidth: 250, background: "#201E29", borderRadius: 20, padding: "20px 22px" }}>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>What mattered most</div>
      <div style={{ fontSize: 13, color: "#AFA9BD", marginBottom: 14 }}>Worked out from your answers</div>
      {order.map((d, i) => (
        <div key={d} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
          <span style={{ flex: "0 0 104px", fontSize: 13, color: "#D7D2E0" }}>{PANEL_LABEL[d]}</span>
          <span style={{ flex: "1 1 auto", height: 9, borderRadius: 999, background: "#33303F", overflow: "hidden" }}>
            <span style={css("display:block;height:100%;border-radius:999px;background:" + (i === 0 ? "#FFC24B" : ACCENT) + ";transition:width .9s cubic-bezier(.34,1.1,.64,1) " + i * 0.07 + "s, background .35s ease;width:" + (on ? (weights[d] / max) * 100 : 0) + "%;")} />
          </span>
          <span style={{ flex: "0 0 32px", textAlign: "right", fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{Math.round(weights[d] * 100)}%</span>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={css("margin-top:10px;background:none;border:none;padding:8px 0;font-size:13px;font-weight:700;color:#BEB8C9;text-decoration:underline;cursor:pointer;min-height:36px;")}
      >
        {open ? "Hide where these came from" : "Where these came from"}
      </button>
      {open && (
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 6, animation: "v3-fade .25s ease-out both" }}>
          {notes.length === 0 && <div style={{ fontSize: 13, color: "#BEB8C9", lineHeight: 1.5 }}>Only your order from question 3. Nothing else moved the weights.</div>}
          {notes.map((n, i) => (
            <div key={i} style={{ fontSize: 13, color: "#D7D2E0", lineHeight: 1.5 }}>
              <span style={{ fontWeight: 800, color: n.delta > 0 ? "#FFC24B" : "#BEB8C9", fontVariantNumeric: "tabular-nums" }}>{n.delta > 0 ? "+" : ""}{Math.round(n.delta * 100)}%</span>{" "}
              {DIM_META[n.dim].label.toLowerCase()} <span style={{ color: "#BEB8C9" }}>· {n.source}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
