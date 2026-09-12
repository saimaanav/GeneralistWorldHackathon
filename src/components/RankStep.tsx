"use client";
import { useState } from "react";
import { css, ACCENT } from "@/lib/proto";
import { DIM_META, type Step } from "@/lib/questionnaire";
import { DIMS, type DimKey } from "@/lib/types";
import { BestMatchTag, recommendedLabel } from "./RecommendedTag";

export interface PresetPill { id: string; label: string; order: string[]; recommended?: boolean }

const ARROW = "flex:0 0 44px;width:44px;height:44px;border-radius:12px;background:#FFFFFF;border:2px solid #EFE7DA;color:#3F3A48;font-size:16px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color .18s ease,background .18s ease;";

export default function RankStep({ step, order, onChange, presets, activePreset, bestId, weights, business }: {
  step: Step;
  order: string[];
  onChange: (order: string[]) => void;
  presets: PresetPill[];
  activePreset?: string;
  bestId?: string;
  weights: Record<DimKey, number>;
  business?: string;
}) {
  const items = step.items || [];
  const byId = new Map(items.map((i) => [i.id, i]));
  const ids = order.filter((id) => byId.has(id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const move = (id: string, delta: number) => {
    const i = ids.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    next.splice(i, 1);
    next.splice(j, 0, id);
    onChange(next);
  };
  const place = (id: string, at: number) => {
    const i = ids.indexOf(id);
    if (i < 0) return;
    const next = [...ids];
    next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, at)), 0, id);
    onChange(next);
  };

  const perf = Math.round((weights.performance || 0) * 100);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: "#565064", marginRight: 4 }}>Presets</span>
        {presets.map((p) => {
          const active = activePreset === p.id;
          const base = "border-radius:999px;padding:9px 16px;min-height:44px;font-size:14px;font-weight:700;cursor:pointer;transition:border-color .18s ease,background .18s ease,transform .18s cubic-bezier(.34,1.56,.64,1);";
          const look = p.recommended
            ? "background:" + (active ? "#FFC24B" : "#FFF3D6") + ";border:2px solid " + (active ? "#E0A52E" : "#FFD98A") + ";color:#40300A;"
            : "background:" + (active ? "#F0F7F6" : "#FFFFFF") + ";border:2px solid " + (active ? ACCENT : "#EFE7DA") + ";color:#3F3A48;";
          return (
            <button key={p.id} type="button" className="spring-2" aria-pressed={active} title={p.recommended ? p.label + " preset" : undefined} onClick={() => onChange(p.order)} style={css(base + look)}>
              {p.recommended ? recommendedLabel(business) : p.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }} role="list" aria-label="Your order, most important first">
        {ids.map((id, i) => {
          const it = byId.get(id)!;
          const top = i === 0;
          const isBest = bestId === id;
          const over = overId === id && dragId && dragId !== id;
          return (
            <div
              key={id}
              role="listitem"
              draggable
              onDragStart={(e) => { setDragId(id); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", id); } catch { /* older browsers */ } }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overId !== id) setOverId(id); }}
              onDragLeave={() => { if (overId === id) setOverId(null); }}
              onDrop={(e) => { e.preventDefault(); const from = dragId || e.dataTransfer.getData("text/plain"); if (from && from !== id) place(from, ids.indexOf(id)); setDragId(null); setOverId(null); }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              className="nudge-4"
              style={css(
                "display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:16px;cursor:grab;transition:border-color .18s ease,background .18s ease,transform .18s cubic-bezier(.34,1.56,.64,1),opacity .18s ease;background:" +
                (over ? "#F0F7F6" : "#FDF9F2") + ";border:2px solid " + (over ? ACCENT : isBest ? "#9CCFCA" : "#EFE7DA") + ";opacity:" + (dragId === id ? 0.5 : 1) + ";"
              )}
            >
              <button
                type="button"
                onClick={() => move(id, -1)}
                aria-label={"Move " + it.label + " up one place"}
                style={css("flex:1 1 auto;display:flex;gap:12px;align-items:center;min-height:44px;background:none;border:none;padding:0;cursor:pointer;text-align:left;min-width:0;")}
              >
                <span style={css("flex:0 0 30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;transition:background .2s ease;background:" + (top ? "#FFC24B" : "#16151C") + ";color:" + (top ? "#40300A" : "#FFF8EE") + ";")}>{i + 1}</span>
                <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 17, fontWeight: 600, color: "#16151C" }}>{it.label}</span>
                    {isBest && <BestMatchTag />}
                  </span>
                  <span style={{ fontSize: 14, color: "#565064" }}>{it.plain}</span>
                </span>
              </button>
              <span className="rank-arrows" style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
                <button type="button" className="edge" aria-label={"Move " + it.label + " up"} disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(id, -1); }} style={css(ARROW + (i === 0 ? "opacity:.35;cursor:default;" : ""))}>▲</button>
                <button type="button" className="edge" aria-label={"Move " + it.label + " down"} disabled={i === ids.length - 1} onClick={(e) => { e.stopPropagation(); move(id, 1); }} style={css(ARROW + (i === ids.length - 1 ? "opacity:.35;cursor:default;" : ""))}>▼</button>
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 18, background: "#F3EEE4", borderRadius: 14, padding: "12px 14px" }} aria-live="polite">
        <div style={{ fontSize: 15, fontWeight: 700, color: "#16151C" }}>
          Right now: {perf}% good at the work, {100 - perf}% safety
        </div>
        <div style={{ fontSize: 13, color: "#565064", marginTop: 4, lineHeight: 1.5 }}>
          {DIMS.map((d, i) => (
            <span key={d}>{i > 0 ? " · " : ""}{DIM_META[d].label} {Math.round((weights[d] || 0) * 100)}%</span>
          ))}
        </div>
      </div>
    </div>
  );
}
