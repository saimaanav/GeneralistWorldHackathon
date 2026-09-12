"use client";
import { useEffect, useRef, useState } from "react";
import { ACCENT, DIAL_C } from "@/lib/proto";

/** The match ring: sweeps 0 to value over 1.2s, the number counts up over 1.1s with a cubic ease. */
export default function MatchDial({ value, on, delay = 0, winner = false }: { value: number; on: boolean; delay?: number; winner?: boolean }) {
  const target = Math.round(Math.max(0, Math.min(100, value)));
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    if (!on) return;
    const from = shownRef.current;
    const to = target;
    if (from === to) return;
    const dur = 1100;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (to - from) * e);
      shownRef.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const wait = setTimeout(() => { raf = requestAnimationFrame(tick); }, Math.round(delay * 1000));
    return () => { clearTimeout(wait); cancelAnimationFrame(raf); };
  }, [on, target, delay]);

  const offset = on ? DIAL_C * (1 - target / 100) : DIAL_C;
  return (
    <div style={{ position: "relative", width: 130, height: 130, margin: "0 auto" }} role="img" aria-label={target + " out of 100 match"}>
      <svg viewBox="0 0 120 120" style={{ width: 130, height: 130, transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#EFE7DA" strokeWidth="12" />
        <circle cx="60" cy="60" r="52" fill="none" strokeLinecap="round" strokeWidth="12" style={{ stroke: winner ? ACCENT : "#4F9A95", strokeDasharray: DIAL_C, strokeDashoffset: offset, transition: "stroke-dashoffset 1.2s cubic-bezier(.34,1.05,.64,1) " + delay + "s, stroke .3s ease" }} />
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{on ? shown : target}</span>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#565064" }}>match</span>
      </span>
    </div>
  );
}
