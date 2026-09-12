import { getClient, MODEL, streamResponse } from "@/lib/anthropic";
import { MODELS, modelById } from "@/lib/data";
import { answersToProfile, EMPTY_ANSWERS, optionLabel } from "@/lib/questionnaire";
import { rankModels } from "@/lib/scoring";
import { explainText } from "@/lib/explainTemplate";
import { EXPLAIN_SYSTEM, explainUser, weakestDim } from "@/lib/prompts";
import { chunkById, docsForModel, search, type Chunk } from "@/lib/retrieval";
import { DIM_META } from "@/lib/questionnaire";
import type { Answers, Interpretation } from "@/lib/types";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { modelId?: string; answers?: Partial<Answers>; interpretation?: Interpretation | null } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const model = body.modelId ? modelById(body.modelId) : undefined;
  if (!model) return Response.json({ error: "unknown model" }, { status: 400 });
  const answers: Answers = { ...EMPTY_ANSWERS, ...(body.answers || {}) };
  const profile = answersToProfile(answers, body.interpretation || null);
  const { list } = rankModels(profile, MODELS);
  const idx = list.findIndex((r) => r.model.id === model.id);
  const ranked = list[idx];
  const rank = idx + 1;
  const fallback = explainText(ranked, profile, rank);
  const client = getClient();
  if (!client) return Response.json({ mode: "template", text: fallback });

  const curated: Chunk[] = [];
  const seen = new Set<string>();
  const evidenceLists = [model.policy.evidence, ...Object.values(model.dims).map((d) => d.evidence)];
  for (const list of evidenceLists) for (const ev of list || []) { if (ev.chunk_id && !seen.has(ev.chunk_id)) { const c = chunkById(ev.chunk_id); if (c) { curated.push(c); seen.add(ev.chunk_id); } } }
  // Evidence recorded from cards we have not indexed yet becomes a research-note passage with the same id the drawer uses.
  const notes: Chunk[] = [];
  const dimLists: [string, typeof model.policy.evidence][] = [["Keeps your data private (policy)", model.policy.evidence], ...Object.entries(model.dims).map(([k, d]) => [DIM_META[k as keyof typeof DIM_META]?.label || k, d.evidence] as [string, typeof model.policy.evidence])];
  for (const [what, list] of dimLists) for (const ev of list || []) {
    if (!ev.chunk_id || seen.has(ev.chunk_id) || !ev.quote) continue;
    if (chunkById(ev.chunk_id)) continue;
    notes.push({ id: ev.chunk_id, doc_id: ev.doc_id, maker: model.maker, section: "research note", page: null, text: `${what}: ${ev.quote} (research note: figure recorded from the maker's published card, which we have not indexed yet)` });
    seen.add(ev.chunk_id);
  }
  const weakest = weakestDim(ranked, profile);
  const q = profile.tasks.map((t) => optionLabel("jobs", t)).join(" ") + " " + DIM_META[weakest].technical;
  const extra = search(q, { docIds: docsForModel(model), k: 8 }).filter((c) => !seen.has(c.id)).slice(0, 3);
  const chunks = [...curated, ...notes, ...extra].slice(0, 14);
  if (!chunks.length) return Response.json({ mode: "template", text: fallback });

  const stream = client.messages.stream({
    model: MODEL, max_tokens: 700, output_config: { effort: "low" },
    system: [{ type: "text", text: EXPLAIN_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: explainUser(ranked, profile, rank, chunks) }],
  });
  return streamResponse(stream, fallback);
}
