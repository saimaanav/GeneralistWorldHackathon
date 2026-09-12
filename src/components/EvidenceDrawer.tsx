"use client";
import { useEffect, useState } from "react";
import { css, maker } from "@/lib/proto";
import { DIM_META } from "@/lib/questionnaire";
import { SOURCES, DATA_VERSION } from "@/lib/data";
import type { DimKey, DimScore, Evidence, Model } from "@/lib/types";

/** `dimScore` is the DimScore the row was scored from (base or the website override). When absent the drawer falls back to model.dims[dim]. */
export interface DrawerTarget { model?: Model; dim?: DimKey; evidence?: Evidence; chunkId?: string; dimScore?: DimScore }
export interface Chunk { id: string; doc_id: string; maker: string; section: string; page: number | null; text: string }

/* ---------- lazily fetched chunk store, cached for the life of the page ---------- */
let chunkCache: Map<string, Chunk> | null = null;
let chunkPromise: Promise<Map<string, Chunk>> | null = null;

export function loadChunks(): Promise<Map<string, Chunk>> {
  if (chunkCache) return Promise.resolve(chunkCache);
  if (!chunkPromise) {
    chunkPromise = fetch("/generated/chunks.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((arr: Chunk[]) => { chunkCache = new Map(arr.map((c) => [c.id, c])); return chunkCache; })
      .catch(() => { chunkPromise = null; return new Map<string, Chunk>(); });
  }
  return chunkPromise;
}
export function hasChunk(id: string): boolean { return Boolean(chunkCache?.has(id)); }
export function chunkById(id: string): Chunk | undefined { return chunkCache?.get(id); }

const SEARCH_WORDS: Record<DimKey, string> = {
  tamper: "jailbreak, prompt injection, adversarial, red team",
  truthfulness: "hallucination, factuality, honesty, truthfulness",
  fairness: "bias, fairness, demographic, stereotype",
  privacy: "training on inputs, retention, zero data retention",
  performance: "benchmark, evaluation, task performance",
};
const CONTEXT = 400;

function typeWord(t?: string): string {
  if (!t) return "document";
  return t.replace(/_/g, " ");
}

function align(chunk: Chunk | undefined, quote: string | undefined): { before: string; quote: string; after: string; found: boolean } {
  if (!chunk) return { before: "", quote: quote || "", after: "", found: false };
  const text = chunk.text.replace(/\s+/g, " ");
  const q = (quote || "").replace(/\s+/g, " ").trim();
  if (!q) return { before: "", quote: text.slice(0, CONTEXT * 2) + (text.length > CONTEXT * 2 ? "…" : ""), after: "", found: false };
  let i = text.indexOf(q);
  if (i < 0) i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) {
    // Try the first sentence of the quote, which survives PDF line wrapping better.
    const head = q.split(/[.:;]/)[0].trim();
    if (head.length >= 20) i = text.toLowerCase().indexOf(head.toLowerCase());
    if (i >= 0) {
      const start = Math.max(0, i - CONTEXT), end = Math.min(text.length, i + head.length + CONTEXT);
      return { before: (start > 0 ? "…" : "") + text.slice(start, i), quote: text.slice(i, i + head.length), after: text.slice(i + head.length, end) + (end < text.length ? "…" : ""), found: true };
    }
    return { before: "", quote: q, after: "", found: false };
  }
  const start = Math.max(0, i - CONTEXT), end = Math.min(text.length, i + q.length + CONTEXT);
  return { before: (start > 0 ? "…" : "") + text.slice(start, i), quote: text.slice(i, i + q.length), after: text.slice(i + q.length, end) + (end < text.length ? "…" : ""), found: true };
}

const QUOTE_BOX = "font-size:16px;line-height:1.75;color:#565064;background:#FDF9F2;border-radius:18px;padding:20px;border-left:5px solid #FFC24B;overflow-wrap:anywhere;";
const PLAIN_BOX = "margin-top:18px;background:#E6F2F0;border-radius:16px;padding:15px 17px;font-size:15px;line-height:1.6;color:#0F4F4B;";
const MARK = { background: "#FFE3A3", color: "#16151C", padding: "2px 4px", borderRadius: 4 } as const;

export default function EvidenceDrawer({ target, onClose }: { target: DrawerTarget | null; onClose: () => void }) {
  const [chunks, setChunks] = useState<Map<string, Chunk> | null>(chunkCache);

  useEffect(() => {
    if (!target) return;
    let live = true;
    loadChunks().then((m) => { if (live) setChunks(m); });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { live = false; window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [target, onClose]);

  if (!target) return null;

  const { model, dim } = target;
  const dimScore = target.dimScore || (model && dim ? model.dims[dim] : undefined);
  const evidence = target.evidence || dimScore?.evidence?.[0];
  const chunkId = target.chunkId || evidence?.chunk_id;
  const chunk = chunkId ? chunks?.get(chunkId) : undefined;
  const docId = evidence?.doc_id || chunk?.doc_id || model?.card.doc_id;
  const doc = SOURCES.find((s) => s.doc_id === docId);
  // Still waiting on the chunk store. Evidence marked unindexed will never find a chunk, so it does not wait.
  const loading = !chunk && Boolean(chunkId) && chunks === null && !evidence?.unindexed;
  const pending = !evidence && !chunk && dimScore?.status === "pending";
  const missing = !pending && !evidence && !chunk && (!dimScore || dimScore.status === "missing" || dimScore.evidence.length === 0);
  // A figure read from a document we have not indexed: show our plain reading, not the metric string dressed as a quote.
  const cited = !pending && !missing && !chunk && !loading;

  const who = model?.display_name || (chunk ? maker(chunk.maker).name : doc ? maker(doc.maker).name : "");
  const what = dim ? DIM_META[dim].label : "What the document says";
  const title = who ? who + " · " + what : what;
  const sourceLine = (doc?.title || model?.card.title || docId || "the document") + " (" + typeWord(doc?.type || model?.card.type) + ")";
  const page = evidence?.page ?? chunk?.page ?? null;
  const section = (evidence?.section || chunk?.section || "").trim();
  const locator = pending
    ? "awaiting verification · fetched " + DATA_VERSION
    : missing
      ? "no matching passage · fetched " + DATA_VERSION
      : [page ? "page " + page : "", section, "fetched " + DATA_VERSION].filter(Boolean).join(" · ");
  const href = evidence?.url || model?.card.url || doc?.url || "#";
  const aligned = missing || pending ? null : align(chunk, evidence?.quote);
  const searchWords = dimScore?.metric || (dim ? SEARCH_WORDS[dim] : "test results");
  const figure = [dimScore?.metric, dimScore?.value].filter(Boolean).join(": ");
  const plainReading = (dimScore?.plain || "").trim() || (dim ? DIM_META[dim].plain : "");
  const eyebrow = pending ? "Still checking" : cited ? "From the document" : "Straight from the document";

  return (
    <>
      <div onClick={onClose} style={css("position:fixed;inset:0;background:rgba(22,21,28,.5);z-index:60;animation:v3-fade .2s ease-out both;")} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} style={css("position:fixed;top:0;right:0;bottom:0;width:min(520px, 100%);background:#FFFFFF;z-index:61;overflow-y:auto;animation:v3-drawer .3s cubic-bezier(.2,.9,.2,1) both;")}>
        <div style={{ padding: "24px 28px", borderBottom: "2px solid #F5F0E7", display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#565064" }}>{eyebrow}</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 5, textWrap: "pretty" }}>{title}</div>
          </div>
          <button type="button" onClick={onClose} autoFocus aria-label="Close" className="close" style={css("margin-left:auto;flex:0 0 44px;background:#F5F0E7;border:none;border-radius:50%;width:44px;height:44px;font-size:20px;color:#3F3A48;cursor:pointer;transition:background .18s ease;")}>×</button>
        </div>
        <div style={{ padding: "24px 28px 44px" }}>
          {pending ? (
            <>
              <div style={css(QUOTE_BOX)}>
                We are still checking this one. We have not yet verified <mark style={MARK}>{searchWords}</mark> for {who || "this model"}, so it is left out of the average until we do.
              </div>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#6E687C" }}>
                <div>{sourceLine}</div>
                <div>{locator}</div>
                {dimScore?.curator_note ? <div>note: {dimScore.curator_note}</div> : null}
              </div>
              <div style={css(PLAIN_BOX)}>
                <strong style={{ fontWeight: 800 }}>In plain English.</strong> A result exists but we have not confirmed it against the original yet. Until we do, this check does not count for or against the model, and the model cannot come first.
              </div>
            </>
          ) : missing ? (
            <>
              <div style={css(QUOTE_BOX)}>
                We searched the whole document for <mark style={MARK}>{searchWords}</mark> and found no test results.
              </div>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#6E687C" }}>
                <div>{sourceLine}</div>
                <div>{locator}</div>
              </div>
              <div style={css(PLAIN_BOX)}>
                <strong style={{ fontWeight: 800 }}>In plain English.</strong> A blank is not proof the model is unsafe. It means nobody has told you either way, and we will not guess on your behalf.
              </div>
            </>
          ) : cited ? (
            <>
              <div style={css(QUOTE_BOX)}>
                {plainReading || aligned!.quote ? <mark style={MARK}>{plainReading || aligned!.quote}</mark> : null}
              </div>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#6E687C" }}>
                {figure ? <div>{figure}</div> : null}
                {evidence?.quote && evidence.quote !== figure ? <div>{evidence.quote}</div> : null}
                <div>{sourceLine}</div>
                <div>{locator}</div>
                {dimScore?.stale ? <div>note: measured on an earlier version of this model</div> : null}
                {dimScore?.curator_note ? <div>note: {dimScore.curator_note}</div> : null}
              </div>
              <div style={css(PLAIN_BOX)}>
                <strong style={{ fontWeight: 800 }}>In plain English.</strong> The box above is our reading of the figure, not a quote. The figure comes from the maker&apos;s published document, linked below. We have not yet indexed that document to highlight the exact sentence, so treat it as a citation to the page rather than a quote.
              </div>
            </>
          ) : (
            <>
              <div style={css(QUOTE_BOX)}>
                {aligned!.before}
                {aligned!.quote ? <mark style={MARK}>{aligned!.quote}</mark> : null}
                {aligned!.after}
                {loading ? <span style={{ display: "block", marginTop: 8, fontSize: 13, color: "#565064", animation: "v3-blink 1.2s ease-in-out infinite" }}>Fetching the passage around it…</span> : null}
              </div>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#6E687C" }}>
                <div>{sourceLine}</div>
                <div>{locator}</div>
                {dimScore?.stale ? <div>note: measured on an earlier version of this model</div> : null}
                {dimScore?.curator_note ? <div>note: {dimScore.curator_note}</div> : null}
              </div>
              <div style={css(PLAIN_BOX)}>
                <strong style={{ fontWeight: 800 }}>In plain English.</strong> This is the maker&apos;s own wording, copied from their document. We check every quote against the original file, and anything we cannot find is marked as still checking rather than scored.
              </div>
            </>
          )}
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 18, fontSize: 15, fontWeight: 700, padding: "10px 0" }}>Open the full document ↗</a>
        </div>
      </div>
    </>
  );
}
