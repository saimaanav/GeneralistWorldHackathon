"use client";
import { css, badgeStyle } from "@/lib/proto";
import type { DimKey, Evidence, Ranked } from "@/lib/types";
import MakerTile from "./MakerTile";
import type { DrawerTarget } from "./EvidenceDrawer";

/** A short badge and the evidence to open, worked out from the scoring reasons. */
function reasonBadge(r: Ranked): { text: string; dim: DimKey; evidence?: Evidence } {
  const m = r.model;
  const joined = r.reasons.join(" ").toLowerCase();
  if (joined.includes("off script")) return { text: "nothing published about being tricked", dim: "tamper", evidence: m.dims.tamper.evidence[0] };
  if (joined.includes("accuracy testing")) return { text: "no accuracy testing published", dim: "truthfulness", evidence: m.dims.truthfulness.evidence[0] };
  if (joined.includes("zero data retention")) return { text: "no zero retention option", dim: "privacy", evidence: m.policy.evidence[0] || m.dims.privacy.evidence[0] };
  if (joined.includes("how long")) return { text: "retention period not published", dim: "privacy", evidence: m.policy.evidence[0] || m.dims.privacy.evidence[0] };
  if (joined.includes("training by default")) return { text: "trains on your inputs by default", dim: "privacy", evidence: m.policy.evidence[0] || m.dims.privacy.evidence[0] };
  if (joined.includes("does not state")) return { text: "training use not stated", dim: "privacy", evidence: m.policy.evidence[0] || m.dims.privacy.evidence[0] };
  return { text: "a poor fit for your answers", dim: "privacy", evidence: m.dims.privacy.evidence[0] };
}

function sentence(reasons: string[]): string {
  if (!reasons.length) return "";
  const s = reasons.join(", and ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}

export default function SetAsideStrip({ title, sub, items, openDrawer }: {
  title: string;
  sub: string;
  items: Ranked[];
  openDrawer: (t: DrawerTarget) => void;
}) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 24, background: "#FFFFFF", borderRadius: 26, padding: "24px 28px", boxShadow: "0 14px 30px rgba(22,21,28,.06)" }}>
      <h3 style={{ fontSize: 20 }}>{title}</h3>
      <p style={{ fontSize: 15, color: "#565064", margin: "6px 0 16px" }}>{sub}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((r) => {
          const m = r.model;
          const b = reasonBadge(r);
          const badges = (m.badges && m.badges.length) ? m.badges : [{ text: b.text, kind: "warn" as const }];
          return (
            <div key={m.id} style={{ background: "#FDF9F2", borderRadius: 18, padding: 20, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 320px", minWidth: 250 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <MakerTile makerKey={m.maker} size={34} />
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{m.display_name}</span>
                  {badges.map((x, i) => <span key={i} style={css(badgeStyle(x.kind))}>{x.text}</span>)}
                  {badges.every((x) => x.text !== b.text) && <span style={css(badgeStyle("warn"))}>{b.text}</span>}
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: "#3F3A48", margin: "8px 0 0", maxWidth: "62ch" }}>
                  {sentence(r.reasons)} {m.one_liner}
                </p>
              </div>
              <button type="button" onClick={() => openDrawer({ model: m, dim: b.dim, evidence: b.evidence })} className="edge" style={css("background:#FFFFFF;border:2px solid #EFE7DA;border-radius:999px;padding:10px 20px;min-height:44px;font-size:14px;font-weight:700;color:#3F3A48;cursor:pointer;transition:border-color .18s ease;")}>Show me where</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
