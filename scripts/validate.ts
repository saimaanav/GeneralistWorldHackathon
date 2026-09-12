/* Resolves every evidence item in data/scores.json to a chunk in data/generated/chunks.json and writes data/scores.resolved.json.
   Evidence items carry either a verbatim `quote` or a list of `terms` that must all appear in one chunk; the matched sentence becomes the quote.
   Unresolved evidence flips that dimension to `pending` ("we are still checking"). Strict checks fail loudly. Local only. */
import fs from "node:fs";
import path from "node:path";

type Chunk = { id: string; doc_id: string; maker: string; section: string; page: number | null; text: string };
type Evidence = { doc_id: string; source_type: string; quote?: string; terms?: string[]; chunk_id?: string; page?: number | null; section?: string; url?: string; note?: string };
type Dim = { score: number | null; status: string; evidence: Evidence[]; metric?: string; value?: string; unverified?: unknown };

const ROOT = process.cwd();
const chunks: Chunk[] = JSON.parse(fs.readFileSync(path.join(ROOT, "data/generated/chunks.json"), "utf8"));
const sources = JSON.parse(fs.readFileSync(path.join(ROOT, "data/sources.json"), "utf8")) as { docs: { doc_id: string; url: string; type: string }[] };
const scores = JSON.parse(fs.readFileSync(path.join(ROOT, "data/scores.json"), "utf8"));
const byDoc = new Map<string, Chunk[]>();
for (const c of chunks) { if (!byDoc.has(c.doc_id)) byDoc.set(c.doc_id, []); byDoc.get(c.doc_id)!.push(c); }
const docUrl = new Map(sources.docs.map((d) => [d.doc_id, d.url]));
const docType = new Map(sources.docs.map((d) => [d.doc_id, d.type]));

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

function sentenceAround(text: string, idx: number, len: number): string {
  let a = idx, b = idx + len;
  while (a > 0 && !/[.!?\n]/.test(text[a - 1]) && idx - a < 220) a--;
  while (b < text.length && !/[.!?\n]/.test(text[b]) && b - idx < 260) b++;
  return text.slice(a, Math.min(text.length, b + 1)).trim();
}

function resolve(ev: Evidence): { ok: boolean; chunk?: Chunk; quote?: string; why?: string; unindexed?: boolean } {
  const cs = byDoc.get(ev.doc_id);
  if (!cs || !cs.length) return { ok: true, unindexed: true, why: "doc not indexed: " + ev.doc_id };
  if (ev.quote) {
    const q = norm(ev.quote);
    for (const c of cs) { const t = norm(c.text); const i = t.indexOf(q); if (i >= 0) return { ok: true, chunk: c, quote: ev.quote }; }
    const words = q.split(" ").filter((w) => w.length > 2);
    let best: { c: Chunk; hit: number } | null = null;
    for (const c of cs) { const t = norm(c.text); const hit = words.filter((w) => t.includes(w)).length; if (!best || hit > best.hit) best = { c, hit }; }
    if (best && words.length && best.hit / words.length >= 0.9) return { ok: true, chunk: best.c, quote: ev.quote };
    return { ok: false, why: "quote not found (best " + (best ? Math.round((best.hit / Math.max(1, words.length)) * 100) : 0) + "% of words)" };
  }
  if (ev.terms && ev.terms.length) {
    const terms = ev.terms.map(norm);
    let best: { c: Chunk; span: number; first: number; len: number } | null = null;
    for (const c of cs) {
      const t = norm(c.text);
      const idxs = terms.map((term) => t.indexOf(term));
      if (idxs.some((i) => i < 0)) continue;
      const span = Math.max(...idxs) - Math.min(...idxs);
      if (!best || span < best.span) best = { c, span, first: Math.min(...idxs), len: terms[idxs.indexOf(Math.min(...idxs))].length };
    }
    if (!best) {
      const partial = terms.map((term) => term + ":" + cs.filter((c) => norm(c.text).includes(term)).length).join(" ");
      return { ok: false, why: "no chunk has all terms (" + partial + ")" };
    }
    const t = best.c.text;
    const lower = norm(t);
    const start = lower.indexOf(terms[0]);
    let quote = sentenceAround(t, Math.max(0, start), terms[0].length);
    for (const term of terms) if (!norm(quote).includes(term)) { const i = lower.indexOf(term); quote = quote + " … " + sentenceAround(t, i, term.length); }
    return { ok: true, chunk: best.c, quote: quote.slice(0, 600) };
  }
  return { ok: false, why: "evidence has neither quote nor terms" };
}

const problems: string[] = [];
const unresolved: string[] = [];
let resolvedCount = 0, total = 0, unindexedCount = 0;

function processEvidence(list: Evidence[], label: string): boolean {
  let allOk = true;
  for (const ev of list) {
    total++;
    const r = resolve(ev);
    if (r.ok && r.unindexed) { unindexedCount++; (ev as Evidence & { unindexed?: boolean }).unindexed = true; ev.url = ev.url || docUrl.get(ev.doc_id) || ""; continue; }
    if (r.ok && r.chunk) {
      resolvedCount++;
      ev.chunk_id = r.chunk.id; ev.page = r.chunk.page; ev.section = r.chunk.section; ev.quote = r.quote;
      ev.url = (docUrl.get(ev.doc_id) || "") + (r.chunk.page ? "#page=" + r.chunk.page : "");
      ev.source_type = ev.source_type || docType.get(ev.doc_id) || "system_card";
    } else { allOk = false; unresolved.push(label + " [" + ev.doc_id + "] " + r.why); }
  }
  return allOk;
}

for (const m of scores.models) {
  const pol = processEvidence(m.policy.evidence || [], m.id + " policy");
  if (!pol && m.policy.trains_on_inputs_by_default !== "unknown") m.policy.unverified = true;
  for (const [dim, d] of Object.entries(m.dims as Record<string, Dim>)) {
    const label = m.id + " " + dim;
    if (d.status === "inferred" && d.score !== null && d.score > 59) problems.push(label + ": inferred score " + d.score + " exceeds cap 59");
    if (!["reported", "inferred", "third_party", "missing", "pending"].includes(d.status)) problems.push(label + ": bad status " + d.status);
    if (d.status === "missing" || d.status === "pending") { if (d.score !== null && d.status === "missing") { d.score = null; } continue; }
    if (!d.evidence || !d.evidence.length) { problems.push(label + ": " + d.status + " but no evidence"); d.unverified = { score: d.score, status: d.status }; d.status = "pending"; d.score = null; continue; }
    const ok = processEvidence(d.evidence, label);
    if (!ok) { d.unverified = { score: d.score, status: d.status }; d.status = "pending"; d.score = null; }
  }
  for (const [k, d] of Object.entries((m.overrides || {}) as Record<string, Dim>)) {
    if (d.status === "missing" || d.status === "pending") continue;
    const ok = processEvidence(d.evidence || [], m.id + " override " + k);
    if (!ok) { d.unverified = { score: d.score, status: d.status }; d.status = "pending"; d.score = null; }
  }
  if (m.status === "reviewed" && Object.values(m.dims as Record<string, Dim>).some((d) => d.status === "pending")) problems.push(m.id + ": marked reviewed but has pending cells");
}

const pendingCells = scores.models.flatMap((m: { id: string; dims: Record<string, Dim> }) => Object.entries(m.dims).filter(([, d]) => d.status === "pending").map(([k]) => m.id + "." + k));
console.log(`Evidence resolved: ${resolvedCount}/${total} (${unindexedCount} cite documents not yet indexed)`);
if (unresolved.length) { console.log("\nUNRESOLVED (flipped to pending):"); for (const u of unresolved) console.log("  - " + u); }
if (pendingCells.length) console.log("\nPending cells: " + pendingCells.join(", "));
if (problems.length) { console.log("\nPROBLEMS:"); for (const p of problems) console.log("  - " + p); }
scores.validated = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(ROOT, "data/scores.resolved.json"), JSON.stringify(scores, null, 1));
console.log("\nWrote data/scores.resolved.json (" + scores.models.length + " models)");
if (problems.length) process.exit(1);
