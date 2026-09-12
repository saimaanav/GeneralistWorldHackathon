/* Ranks the three personas against the resolved data and checks invariants. */
import fs from "node:fs";
import { rankModels, MISSING_PRIOR } from "../src/lib/scoring";
import { answersToProfile } from "../src/lib/questionnaire";
import type { Model, Answers } from "../src/lib/types";

const scores = JSON.parse(fs.readFileSync("data/scores.resolved.json", "utf8")) as { models: Model[] };
const personas = JSON.parse(fs.readFileSync("data/personas.json", "utf8")) as { id: string; name: string; answers: Answers }[];
let failures = 0;
const fail = (msg: string) => { failures++; console.log("  FAIL: " + msg); };
for (const p of personas) {
  const profile = answersToProfile(p.answers);
  const { list, neverEmpty } = rankModels(profile, scores.models);
  console.log(`\n== ${p.name} (weights ${Object.entries(profile.weights).map(([k, v]) => k + " " + Math.round(v * 100) + "%").join(", ")}; neverEmpty=${neverEmpty})`);
  list.slice(0, 12).forEach((r, i) => console.log(`  ${String(i + 1).padStart(2)}. ${r.model.display_name.padEnd(26)} ${String(r.final).padStart(5)} trust ${String(r.trust).padStart(5)} ${r.partition}${r.pending ? " pending" : ""}${r.reasons.length ? "  (" + r.reasons[0].slice(0, 70) + ")" : ""}`));
  const main = list.filter((r) => r.partition === "main");
  if (!main.length && !neverEmpty) fail("empty main list");
  if (list[0].pending) fail("pending model at #1");
  if (list[0].partition !== "main" && !neverEmpty) fail("#1 is not in the main partition");
  const allMissing = list.find((r) => ["truthfulness", "fairness", "tamper"].every((d) => r.dims[d as "tamper"].status === "missing"));
  if (allMissing && list.indexOf(allMissing) === 0) fail("a model with no published safety testing is #1");
  if (p.id === "northside-physio") {
    const fable = list.find((r) => r.model.id === "fable-5-1");
    if (fable && fable.partition === "main") fail("physio persona: Fable 5.1 (no ZDR) should be set aside");
  }
}
console.log(`\nMISSING_PRIOR=${MISSING_PRIOR}; ${failures ? failures + " failure(s)" : "all invariants hold"}`);
process.exit(failures ? 1 : 0);
