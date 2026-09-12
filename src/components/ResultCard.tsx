"use client";
import { useState } from "react";
import { css, ACCENT, badgeStyle, priceStyle, trustOf, maker } from "@/lib/proto";
import type { Answers, Interpretation, Profile, Ranked } from "@/lib/types";
import MakerTile from "./MakerTile";
import MatchDial from "./MatchDial";
import MiniBars from "./MiniBars";
import DimensionBars from "./DimensionBars";
import WhyPanel from "./WhyPanel";
import type { DrawerTarget } from "./EvidenceDrawer";

export default function ResultCard({ ranked, idx, rankNo, isTop, expanded, onToggle, on, showNumbers, profile, answers, interpretation, openDrawer }: {
  ranked: Ranked;
  idx: number;
  rankNo: number;
  isTop: boolean;
  expanded: boolean;
  onToggle: () => void;
  on: boolean;
  showNumbers: boolean;
  profile: Profile;
  answers: Answers;
  interpretation: Interpretation | null;
  openDrawer: (t: DrawerTarget) => void;
}) {
  const m = ranked.model;
  const [setup, setSetup] = useState(false);
  const [words, colour] = trustOf(ranked.trust);
  const badges = m.badges || [];

  return (
    <div
      className="lift"
      style={css("background:#FFFFFF;border-radius:26px;padding:28px 30px;box-shadow:0 16px 34px rgba(22,21,28," + (isTop ? ".12" : ".06") + ");border:3px solid " + (isTop ? ACCENT : "transparent") + ";animation:v3-rise .5s " + (idx * 0.07 + 0.1) + "s cubic-bezier(.34,1.1,.64,1) both;transition:transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s ease, border-color .3s ease;")}
    >
      {isTop && (
        <div style={css("display:inline-flex;align-items:center;gap:8px;background:#FFC24B;color:#40300A;border-radius:999px;padding:8px 18px;font-size:14px;font-weight:800;margin-bottom:18px;animation:v3-pop .5s .2s cubic-bezier(.34,1.56,.64,1) both;")}>★ Best match for you</div>
      )}

      <div style={{ display: "flex", gap: 26, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 250 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <MakerTile makerKey={m.maker} size={44} />
            <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <h3 style={{ fontSize: 26 }}>{m.display_name}</h3>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#565064" }}>by {maker(m.maker).name}{m.deployment === "open_weights" ? ", runs on your own computer" : ""}</span>
            </span>
          </div>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: "#3F3A48", margin: "10px 0 0", maxWidth: "56ch", textWrap: "pretty" }}>{m.one_liner}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <span style={css(priceStyle(m.price.band))}>{m.price.note}</span>
            {m.data_location && <span style={css(badgeStyle("info"))}>Data processed in: {m.data_location}</span>}
            {badges.map((b, i) => <span key={i} style={css(badgeStyle(b.kind))}>{b.text}</span>)}
          </div>
        </div>

        <div style={{ flex: "0 0 168px", textAlign: "center" }}>
          <MatchDial value={ranked.final} on={on} delay={idx * 0.07} winner={isTop} />
          <div style={{ display: "inline-block", marginTop: 10, fontSize: 13, fontWeight: 800, color: colour, lineHeight: 1.4 }}>
            {words} · {Math.round(ranked.trust)}% of what you care about is published
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18, alignItems: "center" }}>
        {isTop && (
          <button type="button" onClick={() => setSetup((s) => !s)} aria-expanded={setup} className="spring-2" style={css("background:#16151C;color:#FFF8EE;border:none;border-radius:999px;padding:14px 26px;font-size:16px;font-weight:800;cursor:pointer;transition:transform .18s cubic-bezier(.34,1.56,.64,1);")}>
            {setup ? "Hide the setup notes" : "How to set this up →"}
          </button>
        )}
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="edge" style={css("background:#FFFFFF;border:2px solid #EFE7DA;border-radius:999px;padding:12px 22px;font-size:15px;font-weight:700;color:#3F3A48;cursor:pointer;transition:border-color .18s ease,transform .18s ease;")}>
          {expanded ? "Hide the detail" : "See what they publish"}
        </button>
        <MiniBars dims={ranked.dims} on={on} />
      </div>

      {isTop && setup && (
        <div style={css("margin-top:16px;background:#FDF9F2;border-radius:16px;padding:16px 18px;font-size:15px;line-height:1.6;color:#3F3A48;animation:v3-fade .3s ease-out both;")}>
          {m.how_to_use && <p style={{ margin: "0 0 8px" }}><strong style={{ fontWeight: 800 }}>Where you get it:</strong> {m.how_to_use}</p>}
          <p style={{ margin: 0 }}><strong style={{ fontWeight: 800 }}>Do this first:</strong> {m.next_step}</p>
          {m.policy.zdr === "available" || m.policy.zdr === "on_request" ? <p style={{ margin: "8px 0 0" }}>Zero data retention is {m.policy.zdr === "available" ? "available" : "available on request"}. Ask for it before you paste anything with customer details.</p> : null}
        </div>
      )}

      {expanded && (
        <div style={css("margin-top:22px;border-top:2px solid #F3EEE4;padding-top:22px;display:grid;grid-template-columns:repeat(auto-fit, minmax(290px, 1fr));gap:30px;animation:v3-fade .3s ease-out both;")}>
          <DimensionBars ranked={ranked} on={on} showNumbers={showNumbers} profile={profile} openDrawer={openDrawer} />
          <WhyPanel ranked={ranked} profile={profile} rankNo={rankNo} answers={answers} interpretation={interpretation} openDrawer={openDrawer} />
        </div>
      )}
    </div>
  );
}
