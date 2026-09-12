import type { DimKey, Profile, Ranked } from "./types";
import { DIMS } from "./types";
import { DIM_META, optionLabel } from "./questionnaire";

export interface WhyParagraph { before: string; pill: string; after: string; dim?: DimKey }

const ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
export const ordinal = (n: number) => ORD[n - 1] || `${n}th`;
const label = (d: DimKey) => DIM_META[d].label.toLowerCase();

function statusPhrase(status: string): string {
  if (status === "reported") return "publishes a tested number: ";
  if (status === "inferred") return "only describes the behaviour, so it counts for half: ";
  if (status === "third_party") return "publishes a number for an older version, discounted: ";
  if (status === "pending") return "has a result we are still checking: ";
  return "publishes nothing, which costs it twice: ";
}

/** Three short, cited paragraphs. The pill in each one opens the evidence drawer for `dim`. */
export function explainTemplate(r: Ranked, profile: Profile, rank: number): WhyParagraph[] {
  const m = r.model;
  const tasks = profile.tasks.map((t) => optionLabel("jobs", t).toLowerCase());
  const taskText = tasks.length ? tasks.join(" and ") : "your business";
  const weighted = [...DIMS].sort((a, b) => profile.weights[b] - profile.weights[a]);
  const top = weighted[0];
  const topRes = r.dims[top];
  const strongest = [...DIMS].filter((d) => r.dims[d].status === "reported" || r.dims[d].status === "third_party").sort((a, b) => r.dims[b].s - r.dims[a].s)[0];
  const missing = [...DIMS].filter((d) => r.dims[d].status === "missing").sort((a, b) => profile.weights[b] - profile.weights[a])[0];
  const weakest = [...DIMS].filter((d) => r.dims[d].status !== "pending").sort((a, b) => r.dims[a].s - r.dims[b].s)[0];
  const out: WhyParagraph[] = [];

  if (r.partition !== "main") {
    out.push({ before: `Set aside for you because ${r.reasons.join(", and ")}. On the check you weighted most, ${label(top)}, the maker ${statusPhrase(topRes.status)}`, pill: topRes.value || topRes.label || "not reported", after: ".", dim: top });
  } else {
    out.push({ before: `Ranked ${ordinal(rank)} for ${taskText}. ${DIM_META[top].label} carries the most weight in your answers, and on that check the maker ${statusPhrase(topRes.status)}`, pill: topRes.value || topRes.label || "not reported", after: ".", dim: top });
  }

  if (strongest) {
    const s = m.dims[strongest];
    out.push({ before: `Its strongest published result for you is on ${label(strongest)}: `, pill: s.value || s.metric || `${s.score} out of 100`, after: s.plain ? `. ${s.plain}` : ".", dim: strongest });
  }

  if (missing) {
    out.push({ before: `The gap is ${label(missing)}. The maker publishes `, pill: "no result at all", after: ` for it, so we scored it low and lowered our confidence. A blank counts against a model twice. ${m.next_step}`, dim: missing });
  } else if (weakest && weakest !== strongest) {
    const w = m.dims[weakest];
    out.push({ before: `Its weakest check is ${label(weakest)}: `, pill: w.value || w.metric || `${w.score} out of 100`, after: `. ${w.plain || ""} ${m.next_step}`.replace(/\s+/g, " "), dim: weakest });
  } else {
    out.push({ before: "", pill: m.next_step, after: "", dim: top });
  }
  return out;
}

/** Plain text version for the keyless explain route and for Claude's fallback. */
export function explainText(r: Ranked, profile: Profile, rank: number): string {
  return explainTemplate(r, profile, rank).map((p) => `${p.before}${p.pill}${p.after}`).join("\n\n");
}
