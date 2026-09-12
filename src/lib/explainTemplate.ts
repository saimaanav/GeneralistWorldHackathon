import type { DimKey, DimScore, Profile, Ranked } from "./types";
import { DIMS } from "./types";
import { DIM_META, optionLabel } from "./questionnaire";

export interface WhyParagraph { before: string; pill: string; after: string; dim?: DimKey }

const ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
export const ordinal = (n: number) => ORD[n - 1] || `${n}th`;
const label = (d: DimKey) => DIM_META[d].label.toLowerCase();
const trimDot = (s: string) => s.trim().replace(/\.$/, "");

/** The job labels are imperative ("Reply to...", "Bookkeeping, invoices..."); these read after "a business that needs to". */
const JOB_PHRASE: Record<string, string> = {
  customer_messages: "reply to customer messages and reviews",
  marketing: "write marketing and product copy",
  documents: "summarise or draft contracts and long documents",
  bookkeeping: "do bookkeeping, invoices and data entry",
  hiring: "screen applicants or write job posts",
  staff_qa: "answer staff questions from its own documents",
  translation: "translate for customers",
  website: "build or fix its website",
};
const jobPhrase = (id: string) => JOB_PHRASE[id] || optionLabel("jobs", id).toLowerCase();

/** "a", "a and b", "a, b and c". */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] || "";
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

/** The DimScore the score for `d` was taken from (base or the website override). */
function sourceOf(r: Ranked, d: DimKey): DimScore | undefined {
  return r.dims[d].source || r.model.dims[d];
}

/** The plain reading for one check, in everyday words. Reads the same figure the score used. */
function plainOf(r: Ranked, d: DimKey): string {
  const x = sourceOf(r, d);
  if (x?.plain) return trimDot(x.plain);
  const res = r.dims[d];
  if (res.status === "pending") return "we are still checking this one";
  if (res.status === "missing") return "nothing published";
  return `${Math.round(res.s)} out of 100`;
}

function phrase(status: string, x?: DimScore): string {
  if (status === "reported") return "publishes a real test result: ";
  if (status === "inferred") return "describes it but gives no number, so it only counts for half: ";
  if (status === "third_party") return x?.stale ? "published a number for an earlier version, which we discount: " : "has a number measured by someone else, which we discount: ";
  if (status === "pending") return "has a result we are still checking: ";
  return "publishes nothing, which counts against it twice: ";
}

/** Three short paragraphs in plain English. The pill in each one opens the evidence drawer for `dim`. The next step is not in here; the panel shows it once, in its own box. */
export function explainTemplate(r: Ranked, profile: Profile, rank: number): WhyParagraph[] {
  const tasks = profile.tasks.map(jobPhrase).filter(Boolean);
  const forWhom = tasks.length ? `for a business that needs to ${joinList(tasks)}` : "for your business";
  const weighted = [...DIMS].sort((a, b) => profile.weights[b] - profile.weights[a]);
  const top = weighted[0];
  const topStatus = r.dims[top].status;
  const strongest = [...DIMS].filter((d) => (r.dims[d].status === "reported" || r.dims[d].status === "third_party") && d !== top).sort((a, b) => r.dims[b].s - r.dims[a].s)[0];
  const missing = [...DIMS].filter((d) => r.dims[d].status === "missing").sort((a, b) => profile.weights[b] - profile.weights[a])[0];
  const weakest = [...DIMS].filter((d) => r.dims[d].status !== "pending" && d !== strongest).sort((a, b) => r.dims[a].s - r.dims[b].s)[0];
  const out: WhyParagraph[] = [];

  const opener = r.partition !== "main"
    ? `Set aside for you because ${r.reasons.join(", and ")}. `
    : `Ranked ${ordinal(rank)} ${forWhom}. `;
  out.push({ before: `${opener}What you care about most is ${label(top)}, and here the maker ${phrase(topStatus, sourceOf(r, top))}`, pill: plainOf(r, top), after: ".", dim: top });

  if (strongest) {
    out.push({ before: `Its best published result for you is on ${label(strongest)}: `, pill: plainOf(r, strongest), after: ".", dim: strongest });
  }

  if (missing) {
    out.push({ before: `The gap is ${label(missing)}. The maker publishes `, pill: "no test result at all", after: " for it, so we scored it low and trust the total less. A blank counts against a model twice.", dim: missing });
  } else if (weakest) {
    out.push({ before: `Its weakest check is ${label(weakest)}: `, pill: plainOf(r, weakest), after: ".", dim: weakest });
  }
  return out;
}

/** Plain text version for the keyless explain route and for Claude's fallback. This one does carry the next step, since there is no box to show it in. */
export function explainText(r: Ranked, profile: Profile, rank: number): string {
  const paras = explainTemplate(r, profile, rank).map((p) => `${p.before}${p.pill}${p.after}`);
  if (r.model.next_step) paras.push(`Do this first: ${r.model.next_step}`);
  return paras.join("\n\n");
}
