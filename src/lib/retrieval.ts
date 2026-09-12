import MiniSearch from "minisearch";
import chunksJson from "../../data/generated/chunks.json";
import indexJson from "../../data/generated/index.json";
import { SOURCES } from "./data";
import type { Model } from "./types";

export interface Chunk { id: string; doc_id: string; maker: string; section: string; page: number | null; text: string }

const CHUNKS = chunksJson as Chunk[];
const BY_ID = new Map(CHUNKS.map((c) => [c.id, c]));
const OPTIONS = { fields: ["text", "section"], storeFields: ["doc_id", "maker", "section", "page"], searchOptions: { prefix: true, fuzzy: 0.2, boost: { section: 1.5 } } };
let ms: MiniSearch | null = null;
function index(): MiniSearch {
  if (!ms) ms = MiniSearch.loadJS(indexJson as unknown as Parameters<typeof MiniSearch.loadJS>[0], OPTIONS);
  return ms;
}

/** Owner words → card vocabulary. */
const SYNONYMS: [RegExp, string[]][] = [
  [/\b(private|privacy|my data|customers'? data|customer data|messages|keep|store|stored)\b/i, ["privacy", "training data", "retention", "opt out", "personal data", "zero data retention"]],
  [/\b(lie|lies|make things up|made up|wrong|mistakes?|get wrong|accurate|accuracy|honest)\b/i, ["hallucination", "factuality", "accuracy", "honesty", "MASK", "SimpleQA"]],
  [/\b(hack|trick|tricked|manipulate|jailbreak|off script|attack)\b/i, ["jailbreak", "prompt injection", "adversarial", "red team", "attack success"]],
  [/\b(unfair|biased?|racist|sexist|offensive|fair)\b/i, ["bias", "fairness", "demographic", "toxicity", "harmful", "BBQ"]],
  [/\b(train|trains|training|learn from)\b/i, ["training data", "fine-tune", "opt out", "improve"]],
  [/\b(delete|deleted|how long|retain|retention)\b/i, ["retention", "deleted", "30 days", "zero data retention"]],
];

export function expandQuery(q: string): string {
  const extra: string[] = [];
  for (const [re, words] of SYNONYMS) if (re.test(q)) extra.push(...words);
  return [q, ...extra].join(" ");
}

export function docsForModel(m: Model): string[] {
  const ids = new Set<string>([m.card.doc_id, ...((m as Model & { docs?: string[] }).docs || [])]);
  for (const d of SOURCES) {
    if (d.doc_id.startsWith(m.id)) ids.add(d.doc_id);
    if (d.maker === m.maker && d.type === "policy_page") ids.add(d.doc_id);
  }
  return [...ids];
}

export function chunkById(id: string): Chunk | undefined { return BY_ID.get(id); }

export function search(query: string, opts: { docIds?: string[]; k?: number } = {}): Chunk[] {
  const allow = opts.docIds ? new Set(opts.docIds) : null;
  const hits = index().search(expandQuery(query), { filter: allow ? (r) => allow.has(String(r.doc_id)) : undefined });
  const out: Chunk[] = [];
  for (const h of hits) { const c = BY_ID.get(String(h.id)); if (c) out.push(c); if (out.length >= (opts.k || 6)) break; }
  return out;
}

export function docTitle(docId: string): string { return SOURCES.find((d) => d.doc_id === docId)?.title || docId; }
