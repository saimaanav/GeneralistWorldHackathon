import type { DimKey, Profile, Ranked } from "./types";
import { DIMS } from "./types";
import { DIM_META, optionLabel } from "./questionnaire";

export interface WhyParagraph { before: string; pill: string; after: string; dim?: DimKey }

const ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
export const ordinal = (n: number) => ORD[n - 1] || `${n}th`;
const label = (d: DimKey) => DIM_META[d].label.toLowerCase();
const trimDot = (s: string) => s.trim().replace(/\.$/, "");

/** The plain reading for one check, in everyday words. */
function plainOf(r: Ranked, d: DimKey): string {
  const x = r.model.dims[d];
  if (x.plain) return trimDot(x.plain);
  const res = r.dims[d];
  if (res.status === "pending") return "we are still checking this one";
  if (res.status === "missing") return "nothing published";
  return `${Math.round(res.s)} out of 100`;
}

function phrase(status: string): string {
  if (status === "reported") return "publishes a real test result: ";
  if (status === "inferred") return "describes it but gives no number, so it only counts for half: ";
  if (status === "third_party") return "published a number for an earlier version, which we discount: ";
  if (status === "pending") return "has a result we are still checking: ";
  return "publishes nothing, which counts against it twice: ";
}

/** Three short paragraphs in plain English. The pill in each one opens the evidence drawer for `dim`. */
export function explainTemplate(r: Ranked, profile: Profile, rank: number): WhyParagraph[] {
  const m = r.model;
  const tasks = profile.tasks.map((t) => optionLabel("jobs", t).toLowerCase());
  const taskText = tasks.length ? tasks.join(" and ") : "your business";
  const weighted = [...DIMS].sort((a, b) => profile.weights[b] - profile.weights[a]);
  const top = weighted[0];
  const topStatus = r.dims[top].status;
  const strongest = [...DIMS].filter((d) => (r.dims[d].status === "reported" || r.dims[d].status === "third_party") && d !== top).sort((a, b) => r.dims[b].s - r.dims[a].s)[0];
  const missing = [...DIMS].filter((d) => r.dims[d].status === "missing").sort((a, b) => profile.weights[b] - profile.weights[a])[0];
  const weakest = [...DIMS].filter((d) => r.dims[d].status !== "pending" && d !== strongest).sort((a, b) => r.dims[a].s - r.dims[b].s)[0];
  const out: WhyParagraph[] = [];

  const opener = r.partition !== "main"
    ? `Set aside for you because ${r.reasons.join(", and ")}. `
    : `Ranked ${ordinal(rank)} for ${taskText}. `;
  out.push({ before: `${opener}What you care about most is ${label(top)}, and here the maker ${phrase(topStatus)}`, pill: plainOf(r, top), after: ".", dim: top });

  if (strongest) {
    out.push({ before: `Its best published result for you is on ${label(strongest)}: `, pill: plainOf(r, strongest), after: ".", dim: strongest });
  }

  if (missing) {
    out.push({ before: `The gap is ${label(missing)}. The maker publishes `, pill: "no test result at all", after: ` for it, so we scored it low and trust the total less. A blank counts against a model twice. Do this first: ${m.next_step}`, dim: missing });
  } else if (weakest) {
    out.push({ before: `Its weakest check is ${label(weakest)}: `, pill: plainOf(r, weakest), after: `. Do this first: ${m.next_step}`, dim: weakest });
  } else {
    out.push({ before: "Do this first: ", pill: m.next_step, after: "", dim: top });
  }
  return out;
}

/** Plain text version for the keyless explain route and for Claude's fallback. */
export function explainText(r: Ranked, profile: Profile, rank: number): string {
  return explainTemplate(r, profile, rank).map((p) => `${p.before}${p.pill}${p.after}`).join("\n\n");
}
