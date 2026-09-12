// Style helpers lifted from the CardCompass UI v3 prototype (design/CardCompass UI v3.dc.html).
import type { CSSProperties } from "react";
import makersJson from "../../data/makers.json";

export const ACCENT = "#17706B";
export const AMBER = "#7A5410";
export const RED = "#9C3A24";

export type Status = "reported" | "inferred" | "third_party" | "missing" | "pending";

export const STATUS_CHIP: Record<Status, string> = {
  reported: "font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#0F4F4B;background:#E6F2F0;border-radius:999px;padding:3px 9px;",
  inferred: "font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#7A5410;background:#FCEFD4;border-radius:999px;padding:3px 9px;",
  third_party: "font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#46414F;background:#F0EBE1;border-radius:999px;padding:3px 9px;",
  missing: "font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#8E3524;background:#FADFD8;border-radius:999px;padding:3px 9px;",
  pending: "font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#565064;background:#FFFFFF;border:1px dashed #C6BFB1;border-radius:999px;padding:2px 9px;",
};

export const STATUS_WORD: Record<Status, string> = {
  reported: "they publish it",
  inferred: "described, not measured",
  third_party: "older version",
  missing: "they do not say",
  pending: "we are still checking",
};

export const STATUS_LEGEND: { status: Status; text: string; sample: number }[] = [
  { status: "reported", text: "A tested number, printed in their own document. Counts in full.", sample: 80 },
  { status: "inferred", text: "They describe the behaviour but publish no number. Capped, and counted at half.", sample: 55 },
  { status: "third_party", text: "Measured by someone else, or by the maker on a previous version of the model.", sample: 70 },
  { status: "missing", text: "Nothing published. Scored low and counted as no evidence, so a gap costs twice.", sample: 35 },
  { status: "pending", text: "Not verified yet. Left out of the average, and the model cannot come first.", sample: 100 },
];

/** Bar fill: encodes status, not just value. */
export function fill(pct: number, status: Status, accent: string, on: boolean, delay = 0): string {
  const w = "display:block;height:100%;border-radius:999px;transition:width .9s cubic-bezier(.34,1.1,.64,1) " + delay + "s;width:" + (on ? pct : 0) + "%;";
  if (status === "reported") return w + "background:" + accent + ";";
  if (status === "inferred") return w + "background:repeating-linear-gradient(90deg,#E8A93C 0 5px,#FCEFD4 5px 10px);";
  if (status === "third_party") return w + "background:" + accent + ";opacity:.5;";
  if (status === "missing") return w + "background:repeating-linear-gradient(45deg,#DFA091 0 5px,#F7DED7 5px 10px);";
  return w + "background:#D8D1C5;";
}

export const BAR_COLOR: Record<Status, string> = { reported: ACCENT, inferred: "#F0C878", third_party: ACCENT, missing: "#E8B7AB", pending: "#D8D1C5" };

export type Maker = { name: string; letter: string; bg: string; fg: string };
export const MAKERS: Record<string, Maker> = makersJson as Record<string, Maker>;

export function maker(key: string): Maker {
  return MAKERS[key] || MAKERS.other;
}

/** Maker monogram tile: rounded square, radius 32% of size, letter in Bricolage 800. */
export function tile(key: string, size = 34): string {
  const m = maker(key);
  const s = size;
  return "display:flex;align-items:center;justify-content:center;flex:0 0 " + s + "px;width:" + s + "px;height:" + s + "px;border-radius:" +
    Math.round(s * 0.32) + "px;background:" + m.bg + ";color:" + m.fg + ";font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:" +
    Math.round(s * (m.letter.length > 1 ? 0.38 : 0.5)) + "px;letter-spacing:-0.02em;transition:transform .22s cubic-bezier(.34,1.56,.64,1);";
}

export const SHORT: Record<string, string> = { truthfulness: "Right", privacy: "Private", tamper: "Safe", fairness: "Fair", performance: "Able" };

export function trustOf(t: number): [string, string] {
  return t >= 75 ? ["Well evidenced", ACCENT] : t >= 50 ? ["Partly evidenced", AMBER] : ["Thin evidence", RED];
}

export type BadgeKind = "warn" | "info" | "pending";
export function badgeStyle(kind: BadgeKind): string {
  return {
    warn: "font-size:13px;font-weight:700;color:#7A5410;background:#FCEFD4;border-radius:999px;padding:6px 14px;",
    info: "font-size:13px;font-weight:700;color:#46414F;background:#F0EBE1;border-radius:999px;padding:6px 14px;",
    pending: "font-size:13px;font-weight:700;color:#565064;background:#FFFFFF;border:1px dashed #C6BFB1;border-radius:999px;padding:5px 14px;",
  }[kind];
}

export function priceStyle(tone: "low" | "mid" | "high"): string {
  return "font-size:13px;font-weight:800;border-radius:999px;padding:6px 14px;" +
    (tone === "low" ? "color:#0F4F4B;background:#E6F2F0;" : tone === "mid" ? "color:#46414F;background:#F0EBE1;" : "color:#565064;background:#F5F0E7;");
}

export const CARD_SHADOW = "0 16px 34px rgba(22,21,28,.06)";
export const EASE_IN = "cubic-bezier(.34,1.1,.64,1)";
export const EASE_SPRING = "cubic-bezier(.34,1.56,.64,1)";
export const DIAL_C = 2 * Math.PI * 52;

/** Convert an inline style string ("a:b;c:d;") into a React style object. */
export function css(s: string, extra?: CSSProperties): CSSProperties {
  const out: Record<string, string> = {};
  for (const part of s.split(";")) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (!k) continue;
    const key = k.startsWith("--") ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = v;
  }
  return Object.assign(out, extra || {}) as CSSProperties;
}

/** Turn a benchmark figure into a count the owner can picture. */
export function asCount(attackSuccessPct: number): string {
  if (attackSuccessPct <= 0) return "no attacks got through";
  if (attackSuccessPct < 1.5) return "attackers got through about 1 time in 100 attempts";
  if (attackSuccessPct >= 45 && attackSuccessPct <= 55) return "about half of attacks got through";
  return "attackers got through " + Math.round(attackSuccessPct) + " times in 100 attempts";
}
