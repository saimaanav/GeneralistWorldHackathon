"use client";
import { css, ACCENT } from "@/lib/proto";
import type { Step } from "@/lib/questionnaire";
import RecommendedTag, { BestMatchTag } from "./RecommendedTag";

export default function QuestionStep({ step, selected, onPick, order, bestId, recommended, business, onUseRecommended }: {
  step: Step;
  selected: string[];
  onPick: (id: string) => void;
  order: string[];
  bestId?: string;
  recommended: string[];
  business?: string;
  onUseRecommended: () => void;
}) {
  const options = step.options || [];
  const byId = new Map(options.map((o) => [o.id, o]));
  const ids = order.filter((id) => byId.has(id));
  const recSet = new Set(recommended);

  return (
    <div>
      {recommended.length > 0 && (
        <div style={{ marginTop: -12, marginBottom: 16 }}>
          <button type="button" onClick={onUseRecommended} style={css("background:none;border:none;padding:10px 0;margin:-10px 0;font-size:15px;font-weight:700;color:#17706B;text-decoration:underline;cursor:pointer;min-height:44px;")}>
            Use recommended
          </button>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ids.map((id) => {
          const o = byId.get(id)!;
          const sel = selected.includes(id);
          const isBest = bestId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              aria-pressed={sel}
              className="nudge-4"
              style={css(
                "display:flex;gap:14px;align-items:center;width:100%;padding:16px 18px;border-radius:16px;cursor:pointer;text-align:left;transition:border-color .18s ease,background .18s ease,transform .18s cubic-bezier(.34,1.56,.64,1);background:" +
                (sel ? "#F0F7F6" : "#FDF9F2") + ";border:2px solid " + (sel ? ACCENT : isBest ? "#9CCFCA" : "#EFE7DA") + ";"
              )}
            >
              <span style={css(
                "flex:0 0 26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#FFFFFF;transition:background .18s ease,transform .25s cubic-bezier(.34,1.56,.64,1);transform:scale(" +
                (sel ? 1 : 0.88) + ");background:" + (sel ? ACCENT : "#FFFFFF") + ";border:2px solid " + (sel ? ACCENT : "#D8D1C5") + ";"
              )}>{sel ? "✓" : ""}</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "left", minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 17, fontWeight: 600, color: "#16151C" }}>{o.label}</span>
                  {isBest && <BestMatchTag />}
                  {recSet.has(id) && <RecommendedTag business={business} />}
                </span>
                {o.effect ? <span style={{ fontSize: 14, color: "#565064" }}>{o.effect}</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
