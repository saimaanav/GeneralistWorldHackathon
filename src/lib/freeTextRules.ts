import type { Interpretation } from "./types";

const RULES: { re: RegExp; deltas?: Interpretation["weight_deltas"]; flags?: string[]; tasks?: string[]; reason: string }[] = [
  { re: /\b(allerg\w*|dosage|ingredients?)\b/i, deltas: { truthfulness: 0.1 }, reason: "allergen or dosage details, so getting things right matters more" },
  { re: /\b(medical|patient|clinic|hipaa|physio|dental|therapy|diagnos\w*|prescri\w*)\b/i, deltas: { truthfulness: 0.1 }, flags: ["sensitive"], reason: "health records, so getting things right and privacy matter more" },
  { re: /\b(card|payment|invoice|stripe|bank|tax|payroll|vat)\b/i, flags: ["payments"], reason: "payment or tax records will be involved" },
  { re: /\b(chatbot|website chat|customers can|public|whatsapp|instagram|dms|reviews)\b/i, flags: ["customers_direct", "public"], deltas: { tamper: 0.05 }, reason: "the public can reach it" },
  { re: /\b(kids|children|school|pupils|students)\b/i, deltas: { fairness: 0.1 }, reason: "children are involved, so fairness counts more" },
  { re: /\b(contract|lease|legal|solicitor|terms)\b/i, flags: ["sensitive"], deltas: { truthfulness: 0.05 }, tasks: ["documents"], reason: "contracts or legal documents" },
  { re: /\b(email|inbox|uploads?|attachments?|forms?)\b/i, flags: ["reads_others"], reason: "it will read things other people send" },
  { re: /\b(hire|hiring|applicant|cv|resume|recruit)\b/i, flags: ["decisions", "sensitive"], deltas: { fairness: 0.1 }, tasks: ["hiring"], reason: "hiring decisions" },
  { re: /\b(book|booking|calendar|refund|order|pay for)\b/i, flags: ["tools"], reason: "it may take actions like bookings or payments" },
  { re: /\b(cheap|budget|cost|afford|small budget)\b/i, deltas: { performance: -0.05 }, reason: "you mentioned cost" },
  { re: /\b(accurate|accuracy|mistake|wrong|reliable|facts)\b/i, deltas: { truthfulness: 0.1 }, reason: "you asked for accuracy" },
];

export function freeTextRules(text: string): Interpretation {
  const t = (text || "").slice(0, 20000);
  const deltas: Interpretation["weight_deltas"] = {};
  const flags = new Set<string>();
  const tasks = new Set<string>();
  const reasons: string[] = [];
  for (const r of RULES) {
    const m = t.match(r.re);
    if (!m) continue;
    for (const [k, v] of Object.entries(r.deltas || {})) deltas[k as keyof typeof deltas] = Math.max(-0.15, Math.min(0.15, (deltas[k as keyof typeof deltas] || 0) + (v as number)));
    for (const f of r.flags || []) flags.add(f);
    for (const k of r.tasks || []) tasks.add(k);
    reasons.push(`You mentioned '${m[0]}': ${r.reason}.`);
  }
  const firstSentence = t.split(/[.!?\n]/)[0]?.trim();
  return {
    summary: firstSentence ? `You told us: "${firstSentence.slice(0, 140)}${firstSentence.length > 140 ? "…" : ""}"` : "",
    weight_deltas: deltas,
    add_tasks: [...tasks].slice(0, 2),
    add_flags: [...flags],
    reasons: reasons.slice(0, 3),
    source: "rules",
  };
}
