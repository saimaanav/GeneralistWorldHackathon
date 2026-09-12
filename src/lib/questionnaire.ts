import MiniSearch from "minisearch";
import qJson from "../../data/questionnaire.json";
import type { Answers, DimKey, Interpretation, Profile, DeltaNote, ProfileFlags } from "./types";
import { DIMS } from "./types";

export interface Option { id: string; label: string; effect?: string; synonyms?: string[] }
export interface RankItem { id: string; label: string; plain: string }
export interface Step {
  id: "business" | "jobs" | "rank" | "audience" | "data" | "reach" | "decisions" | "text";
  n: number;
  type: "single" | "multi" | "rank" | "text";
  title: string;
  hint: string;
  reassure: string;
  max?: number;
  options?: Option[];
  items?: RankItem[];
}
export interface DimMeta { id: DimKey; label: string; short: string; icon: string; plain: string; technical: string }
export interface Questionnaire {
  dims: DimMeta[];
  rankWeights: number[];
  steps: Step[];
  deltas: Record<string, Record<string, Partial<Record<DimKey, number>>>>;
  presets: Record<string, { label: string; order: string[] }>;
  presetPriority: string[];
  recommendations: { when: Record<string, string>; then: Record<string, string[] | string> }[];
}

export const Q = qJson as unknown as Questionnaire;
export const DIM_META: Record<DimKey, DimMeta> = Object.fromEntries(Q.dims.map((d) => [d.id, d])) as Record<DimKey, DimMeta>;
export const RANK_KEYS = ["performance", "truthfulness", "privacy", "fairness", "tamper", "cost"] as const;
export const DEFAULT_RANK: string[] = Q.presets.balanced.order;

export const EMPTY_ANSWERS: Answers = { jobs: [], rank: [], data: [], reach: [] };

export function stepById(id: string): Step | undefined {
  return Q.steps.find((s) => s.id === id);
}

export function optionLabel(stepId: string, optionId: string): string {
  const s = stepById(stepId);
  const o = s?.options?.find((x) => x.id === optionId) || s?.items?.find((x) => x.id === optionId);
  return o?.label || optionId;
}

/* ---------- Recommendations ---------- */

function matches(when: Record<string, string>, a: Answers): boolean {
  return Object.entries(when).every(([k, v]) => {
    const cur = (a as unknown as Record<string, unknown>)[k];
    if (Array.isArray(cur)) return cur.includes(v);
    return cur === v;
  });
}

export interface Recommendation { byStep: Record<string, string[]>; preset?: string; presetOrder?: string[] }

export function recommend(a: Answers): Recommendation {
  const byStep: Record<string, string[]> = {};
  const presets: string[] = [];
  for (const rule of Q.recommendations) {
    if (!matches(rule.when, a)) continue;
    for (const [k, v] of Object.entries(rule.then)) {
      if (k === "preset") { presets.push(v as string); continue; }
      byStep[k] = Array.from(new Set([...(byStep[k] || []), ...(v as string[])]));
    }
  }
  let preset: string | undefined;
  for (const p of Q.presetPriority) if (presets.includes(p)) { preset = p; break; }
  return { byStep, preset, presetOrder: preset ? Q.presets[preset].order : undefined };
}

/* ---------- Type-to-match ---------- */

const indexCache = new Map<string, MiniSearch>();

function indexFor(step: Step): MiniSearch {
  const cached = indexCache.get(step.id);
  if (cached) return cached;
  const docs = (step.options || step.items || []).map((o) => ({
    id: o.id,
    label: o.label,
    synonyms: ((o as Option).synonyms || [(o as RankItem).plain || ""]).join(" "),
  }));
  const ms = new MiniSearch({ fields: ["label", "synonyms"], storeFields: ["id"], searchOptions: { prefix: true, fuzzy: 0.2, boost: { label: 2 }, combineWith: "OR" } });
  ms.addAll(docs);
  indexCache.set(step.id, ms);
  return ms;
}

/** Rank a step's options against free text. Returns option ids best-first with scores. */
export function matchOptions(step: Step, query: string): { id: string; score: number }[] {
  const q = query.trim();
  if (!q || (step.type !== "single" && step.type !== "multi" && step.type !== "rank")) return [];
  const hits = indexFor(step).search(q);
  return hits.map((h) => ({ id: String(h.id), score: h.score }));
}

/* ---------- Answers <-> URL ---------- */

export function answersToParams(a: Answers): URLSearchParams {
  const p = new URLSearchParams();
  if (a.business) p.set("b", a.business);
  if (a.businessOther) p.set("bo", a.businessOther.slice(0, 80));
  if (a.jobs.length) p.set("j", a.jobs.join(","));
  if (a.rank.length) p.set("r", a.rank.join(","));
  if (a.audience) p.set("a", a.audience);
  if (a.data.length) p.set("d", a.data.join(","));
  if (a.reach.length) p.set("s", a.reach.join(","));
  if (a.decisions) p.set("p", a.decisions);
  if (a.text) p.set("t", a.text.slice(0, 500));
  if (a.docName) p.set("dn", a.docName);
  return p;
}

export function paramsToAnswers(p: URLSearchParams): Answers {
  const list = (k: string) => (p.get(k) ? p.get(k)!.split(",").filter(Boolean) : []);
  return {
    business: p.get("b") || undefined,
    businessOther: p.get("bo") || undefined,
    jobs: list("j"),
    rank: list("r"),
    audience: p.get("a") || undefined,
    data: list("d"),
    reach: list("s"),
    decisions: p.get("p") || undefined,
    text: p.get("t") || undefined,
    docName: p.get("dn") || undefined,
  };
}

/* ---------- Profile ---------- */

const CLAMP_MIN = 0.05, CLAMP_MAX = 0.5;

export function answersToProfile(input: Answers, interp?: Interpretation | null): Profile {
  // Merge add-only flags from the interpretation into a copy of the answers.
  const a: Answers = { ...input, jobs: [...input.jobs], data: [...input.data], reach: [...input.reach], rank: [...input.rank] };
  if (interp) {
    for (const t of interp.add_tasks || []) if (!a.jobs.includes(t) && stepById("jobs")?.options?.some((o) => o.id === t)) a.jobs.push(t);
    for (const f of interp.add_flags || []) {
      if (["contacts", "payments", "sensitive"].includes(f) && !a.data.includes(f)) a.data.push(f);
      if (["public", "reads_others", "tools"].includes(f) && !a.reach.includes(f)) a.reach.push(f);
      if (f === "customers_direct") a.audience = "customers_direct";
      if (f === "decisions") a.decisions = "yes";
    }
  }

  const order = a.rank.length === 6 ? a.rank : DEFAULT_RANK;
  const dimOrder = order.filter((k) => k !== "cost") as DimKey[];
  const weights = {} as Record<DimKey, number>;
  const notes: DeltaNote[] = [];
  dimOrder.forEach((k, i) => { weights[k] = Q.rankWeights[i] ?? 0.1; });
  for (const d of DIMS) if (weights[d] === undefined) weights[d] = 0.1;

  const costPos = order.indexOf("cost");
  const tierAdj = costPos >= 0 && costPos <= 1 ? { efficient: 5, flagship: -5 } : costPos >= 4 ? { efficient: 0, flagship: 3 } : { efficient: 0, flagship: 0 };

  const apply = (group: string, id: string | undefined, source: string) => {
    if (!id) return;
    const d = Q.deltas[group]?.[id];
    if (!d) return;
    for (const [dim, delta] of Object.entries(d)) {
      weights[dim as DimKey] += delta as number;
      notes.push({ dim: dim as DimKey, delta: delta as number, source });
    }
  };
  for (const j of a.jobs) apply("jobs", j, "Question 2: " + optionLabel("jobs", j));
  apply("audience", a.audience, "Question 4: " + optionLabel("audience", a.audience || ""));
  for (const d of a.data) apply("data", d, "Question 5: " + optionLabel("data", d));
  for (const r of a.reach) apply("reach", r, "Question 6: " + optionLabel("reach", r));
  apply("decisions", a.decisions, "Question 7: " + optionLabel("decisions", a.decisions || ""));

  if (interp?.weight_deltas) {
    for (const [dim, raw] of Object.entries(interp.weight_deltas)) {
      if (!DIMS.includes(dim as DimKey) || typeof raw !== "number") continue;
      const delta = Math.max(-0.15, Math.min(0.15, raw));
      if (!delta) continue;
      weights[dim as DimKey] += delta;
      notes.push({ dim: dim as DimKey, delta, source: interp.source === "claude" ? "From your description" : "Keyword in your description" });
    }
  }

  for (const d of DIMS) weights[d] = Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, weights[d]));
  const sum = DIMS.reduce((n, d) => n + weights[d], 0);
  for (const d of DIMS) weights[d] = weights[d] / sum;

  const flags: ProfileFlags = {
    regulated: a.data.includes("payments") || a.data.includes("sensitive"),
    strict: a.data.includes("sensitive"),
    customerFacing: a.audience === "customers_direct",
    publicInput: a.reach.includes("public") || a.reach.includes("tools"),
    injectionExposure: a.reach.includes("reads_others") || a.reach.includes("tools"),
    decisions: a.decisions === "yes",
    health: a.business === "health",
  };

  return { weights, tierAdj, flags, tasks: a.jobs, notes, summary: summarize(a), business: a.business };
}

/** Plain-English recap for the results header. */
export function summarize(a: Answers): string {
  const jobs = a.jobs.map((j) => optionLabel("jobs", j).toLowerCase());
  const parts: string[] = [];
  if (a.business === "other" && a.businessOther) parts.push("You run " + (/^[aeiou]/i.test(a.businessOther.trim()) ? "an " : "a ") + a.businessOther.trim().replace(/\.$/, "") + ".");
  if (jobs.length) parts.push("You will use AI to " + joinList(jobs.map(lowerFirst)) + ".");
  if (a.audience === "customers_direct") parts.push("Customers read what it writes with nobody checking first");
  else if (a.audience === "customers_reviewed") parts.push("Customers read what it writes after someone checks it");
  else if (a.audience === "only_me") parts.push("Only you and your team see what it writes");
  const reach: string[] = [];
  if (a.reach.includes("public")) reach.push("the public can message it");
  if (a.reach.includes("reads_others")) reach.push("it reads things other people send you");
  if (a.reach.includes("tools")) reach.push("it can take actions on your behalf");
  if (reach.length) parts[parts.length - 1] = (parts[parts.length - 1] || "") + (parts.length ? ", " : "") + joinList(reach);
  if (parts.length > 1 || reach.length) parts[parts.length - 1] += ".";
  const data: string[] = [];
  if (a.data.includes("contacts")) data.push("customer names");
  if (a.data.includes("payments")) data.push("payment or tax records");
  if (a.data.includes("sensitive")) data.push("health, legal or HR records");
  if (data.length) parts.push("You will paste in " + joinList(data) + ".");
  if (a.decisions === "yes") parts.push("It will help decide things about people, so fairness is weighted heavily.");
  const costPos = (a.rank.length === 6 ? a.rank : DEFAULT_RANK).indexOf("cost");
  if (costPos <= 1) parts.push("You want the cheapest option that is still safe.");
  else if (costPos >= 4) parts.push("You want the best results and cost comes second.");
  return parts.join(" ").replace(/\.\./g, ".");
}

function lowerFirst(s: string) { return s.charAt(0).toLowerCase() + s.slice(1); }
function joinList(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  return xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
}
