/* Cards in data/cards -> data/generated/{chunks,index,stats}.json (+ copies in public/generated). Runs locally only. */
import fs from "node:fs";
import path from "node:path";
import MiniSearch from "minisearch";
import { extractText, getDocumentProxy } from "unpdf";

const ROOT = process.cwd();
const CARDS = path.join(ROOT, "data", "cards");
const OUT = path.join(ROOT, "data", "generated");
const PUB = path.join(ROOT, "public", "generated");
const CHUNK = 1000, OVERLAP = 150;

type Doc = { doc_id: string; file: string; title: string; maker: string; type: string; url: string; published: string };
type Chunk = { id: string; doc_id: string; maker: string; section: string; page: number | null; text: string };

function decodeEntities(s: string) {
  return s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&[a-z]+;/g, " ");
}

function htmlToText(html: string): string {
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ").replace(/<header[\s\S]*?<\/header>/gi, " ").replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, l, t) => "\n\n" + "#".repeat(Number(l)) + " " + t.replace(/<[^>]+>/g, " ") + "\n\n");
  s = s.replace(/<(br|p|div|li|tr|section|article|table|ul|ol|dt|dd|blockquote|pre)[^>]*>/gi, "\n").replace(/<\/(p|div|li|tr|td|th|section|article|table|ul|ol|blockquote|pre)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  return s.replace(/[ \t\r\f\v]+/g, " ").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function normalize(text: string): string {
  return text.replace(/-\n(?=[a-z])/g, "").replace(/[ \t\r\f\v]+/g, " ").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function dropRepeatedLines(pages: string[]): string[] {
  if (pages.length < 6) return pages;
  const counts = new Map<string, number>();
  for (const p of pages) for (const line of new Set(p.split("\n").map((l) => l.trim()).filter((l) => l.length > 3 && l.length < 120))) counts.set(line, (counts.get(line) || 0) + 1);
  const cut = pages.length * 0.3;
  const drop = new Set([...counts.entries()].filter(([, n]) => n > cut).map(([l]) => l));
  return pages.map((p) => p.split("\n").filter((l) => !drop.has(l.trim())).join("\n"));
}

const HEADING = /^(#{1,4}\s+\S.*|\d{1,2}(\.\d{1,2}){0,3}\s+[A-Z][^.]{2,80}|[A-Z][A-Z0-9 ,&:'-]{6,80})$/;

function chunkPage(text: string, page: number | null, doc: Doc, state: { ordinal: number; section: string }, out: Chunk[]) {
  const lines = text.split("\n");
  const sentences: { s: string; section: string }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (HEADING.test(line) && line.length < 90) { state.section = line.replace(/^#+\s*/, ""); }
    for (const s of line.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [line]) sentences.push({ s: s.trim() + " ", section: state.section });
  }
  let buf = "", bufSection = state.section;
  const flush = () => {
    const t = buf.trim();
    if (t.length < 40) { buf = ""; return; }
    out.push({ id: doc.doc_id + "#" + String(state.ordinal++).padStart(4, "0"), doc_id: doc.doc_id, maker: doc.maker, section: bufSection, page, text: t });
    buf = buf.slice(Math.max(0, buf.length - OVERLAP));
  };
  for (const { s, section } of sentences) {
    if (!buf) bufSection = section;
    if (buf.length + s.length > CHUNK && buf.length > OVERLAP + 100) flush();
    buf += s;
  }
  if (buf.trim().length >= 40) { const t = buf.trim(); out.push({ id: doc.doc_id + "#" + String(state.ordinal++).padStart(4, "0"), doc_id: doc.doc_id, maker: doc.maker, section: bufSection, page, text: t }); }
}

async function readDoc(doc: Doc): Promise<{ pages: string[]; kind: string }> {
  const base = doc.file.replace(/\.[^.]+$/, "");
  const override = path.join(CARDS, base + ".txt");
  const file = path.join(CARDS, doc.file);
  const use = fs.existsSync(override) && !doc.file.endsWith(".txt") ? override : file;
  if (!fs.existsSync(use)) return { pages: [], kind: "missing" };
  const ext = path.extname(use).toLowerCase();
  if (use === override && doc.file.endsWith(".pdf")) {
    const raw = fs.readFileSync(use, "utf8");
    return { pages: raw.split("\f").map(normalize), kind: "pdf" };
  }
  if (ext === ".pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(fs.readFileSync(use)));
    const { text } = await extractText(pdf, { mergePages: false });
    return { pages: (text as string[]).map(normalize), kind: "pdf" };
  }
  const raw = fs.readFileSync(use, "utf8");
  if (ext === ".html" || ext === ".htm") return { pages: [normalize(htmlToText(raw))], kind: "html" };
  return { pages: [normalize(raw)], kind: ext.slice(1) };
}

async function main() {
  const sources = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "sources.json"), "utf8")) as { docs: Doc[] };
  const chunks: Chunk[] = [];
  const stats: Record<string, { pages: number; chunks: number; kind: string; chars: number }> = {};
  for (const doc of sources.docs) {
    const { pages, kind } = await readDoc(doc);
    if (!pages.length) { stats[doc.doc_id] = { pages: 0, chunks: 0, kind, chars: 0 }; console.log(`- ${doc.doc_id}: MISSING (${doc.file})`); continue; }
    const cleaned = dropRepeatedLines(pages);
    const state = { ordinal: 0, section: "" };
    const before = chunks.length;
    cleaned.forEach((p, i) => chunkPage(p, kind === "pdf" ? i + 1 : null, doc, state, chunks));
    const chars = cleaned.reduce((n, p) => n + p.length, 0);
    stats[doc.doc_id] = { pages: kind === "pdf" ? pages.length : Math.max(1, Math.round(chars / 3200)), chunks: chunks.length - before, kind, chars };
    console.log(`- ${doc.doc_id}: ${kind}, ${stats[doc.doc_id].pages} pages, ${chunks.length - before} chunks, ${chars} chars`);
  }
  const ms = new MiniSearch({ fields: ["text", "section"], storeFields: ["doc_id", "maker", "section", "page"], searchOptions: { prefix: true, fuzzy: 0.2, boost: { section: 1.5 } } });
  ms.addAll(chunks);
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(PUB, { recursive: true });
  const totalPages = Object.values(stats).reduce((n, s) => n + s.pages, 0);
  const summary = { generated: new Date().toISOString().slice(0, 10), docs: stats, totalPages, totalChunks: chunks.length };
  fs.writeFileSync(path.join(OUT, "chunks.json"), JSON.stringify(chunks));
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(ms));
  fs.writeFileSync(path.join(OUT, "stats.json"), JSON.stringify(summary, null, 2));
  for (const f of ["chunks.json", "index.json", "stats.json"]) fs.copyFileSync(path.join(OUT, f), path.join(PUB, f));
  console.log(`\nTotal: ${totalPages} pages, ${chunks.length} chunks; chunks.json ${(fs.statSync(path.join(OUT, "chunks.json")).size / 1e6).toFixed(1)} MB, index.json ${(fs.statSync(path.join(OUT, "index.json")).size / 1e6).toFixed(1)} MB`);
}
main().catch((e) => { console.error(e); process.exit(1); });
