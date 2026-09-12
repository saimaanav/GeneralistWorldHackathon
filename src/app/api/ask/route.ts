import { getClient, MODEL, streamResponse } from "@/lib/anthropic";
import { MODELS, modelById } from "@/lib/data";
import { ASK_SYSTEM, askUser } from "@/lib/prompts";
import { docsForModel, search } from "@/lib/retrieval";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { question?: string; modelIds?: string[] } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const question = String(body.question || "").slice(0, 500).trim();
  if (!question) return Response.json({ error: "no question" }, { status: 400 });
  const ids = Array.isArray(body.modelIds) ? body.modelIds.filter((x): x is string => typeof x === "string").slice(0, 40) : [];
  const models = ids.map((id) => modelById(id)).filter((m): m is NonNullable<typeof m> => Boolean(m));
  const pool = models.length ? models : MODELS.slice(0, 8);
  const docIds = [...new Set(pool.flatMap((m) => docsForModel(m)))];
  const chunks = search(question, { docIds, k: 8 });
  const passages = chunks.map((c) => ({ id: c.id, doc_id: c.doc_id, page: c.page, section: c.section, text: c.text.slice(0, 600), maker: c.maker }));
  const client = getClient();
  const fallback = passages.length ? "Here is what the cards say. " + passages.slice(0, 3).map((p) => `[c:${p.id}] ${p.text.slice(0, 200)}`).join(" ") : "The cards I have do not answer this.";
  if (!client) return Response.json({ mode: "passages", passages });
  const stream = client.messages.stream({
    model: MODEL, max_tokens: 500, output_config: { effort: "low" },
    system: [{ type: "text", text: ASK_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: askUser(question, chunks, pool.map((m) => m.display_name)) }],
  });
  return streamResponse(stream, fallback);
}
