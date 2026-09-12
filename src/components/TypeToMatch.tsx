"use client";
import { css } from "@/lib/proto";

const BOX = "width:100%;min-height:52px;padding:14px 16px;font-size:16px;line-height:1.4;color:#16151C;background:#FDF9F2;border:2px solid #EFE7DA;border-radius:16px;transition:border-color .18s ease;";

export default function TypeToMatch({ value, onChange, onEnter, noMatch, bestLabel }: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  noMatch: boolean;
  bestLabel?: string;
}) {
  const typed = value.trim().length > 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEnter(); } }}
        placeholder="Type your answer and we'll match it (e.g. bakery, physio)"
        aria-label="Type your answer and we will match it"
        autoComplete="off"
        style={css(BOX)}
      />
      {typed && noMatch && (
        <div style={{ fontSize: 14, color: "#565064", marginTop: 8 }}>We&apos;ll use what you typed. Press Enter or Next and it goes in with your notes.</div>
      )}
      {typed && !noMatch && bestLabel && (
        <div style={{ fontSize: 14, color: "#565064", marginTop: 8 }}>Best match: <strong style={{ color: "#0F4F4B", fontWeight: 700 }}>{bestLabel}</strong>. Press Enter to pick it.</div>
      )}
    </div>
  );
}
