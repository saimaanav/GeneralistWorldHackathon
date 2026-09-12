"use client";
import { useEffect, useState } from "react";
import { BAR_COLOR, css } from "@/lib/proto";
import type { DimKey, Status } from "@/lib/types";

export interface PillarBar { id: string; value: number; status: Status }
export interface Pillar { dim: DimKey; label: string; icon: string; plain: string; footnote: string; bars: PillarBar[] }

export function PillarCard({ pillar, index, active, on, onHover }: { pillar: Pillar; index: number; active: boolean; on: boolean; onHover: () => void }) {
  return (
    <div style={css("animation:v3-rise .5s " + (0.08 * index) + "s ease-out both;")}>
      <div
        onMouseEnter={onHover}
        style={css("background:#FFFFFF;border-radius:22px;padding:22px;box-shadow:0 12px 28px rgba(22,21,28,.06);transition:transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s ease;transform:" + (active ? "translateY(-6px)" : "none") + ";")}
      >
        <span aria-hidden style={css("display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:14px;font-size:20px;background:" + (active ? "#FFC24B" : "#E6F2F0") + ";transition:background .25s ease;")}>{pillar.icon}</span>
        <h3 style={css("font-size:19px;margin-top:14px;")}>{pillar.label}</h3>
        <p style={css("font-size:15px;line-height:1.5;color:#44404E;margin:8px 0 14px;")}>{pillar.plain}</p>
        <div style={css("display:flex;gap:4px;align-items:flex-end;height:54px;")} aria-hidden>
          {pillar.bars.map((b, i) => (
            <span
              key={b.id}
              style={css("flex:1 1 0;border-radius:6px 6px 3px 3px;transition:height .7s cubic-bezier(.34,1.3,.64,1) " + (i * 0.05) + "s;height:" + (on ? Math.max(8, b.value * 0.54) : 4) + "px;background:" + BAR_COLOR[b.status] + ";opacity:" + (b.status === "third_party" ? 0.55 : 1) + ";")}
            />
          ))}
        </div>
        <div style={css("font-size:13px;color:#565064;margin-top:10px;")}>{pillar.footnote}</div>
      </div>
    </div>
  );
}

export default function PillarCards({ pillars }: { pillars: Pillar[] }) {
  const [on, setOn] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 120);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;")}>
      {pillars.map((p, i) => (
        <PillarCard key={p.dim} pillar={p} index={i} active={active === i} on={on} onHover={() => setActive(i)} />
      ))}
    </div>
  );
}
