"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { css, maker } from "@/lib/proto";
import { MODELS } from "@/lib/data";
import { DIMS } from "@/lib/types";
import MakerTile from "./MakerTile";
import { CitedText, readAnswer, dimForChunk, type Passage } from "./WhyPanel";
import { loadChunks, hasChunk, chunkById, type DrawerTarget } from "./EvidenceDrawer";

const CHIPS = ["Does it train on my customers' messages?", "What happens if someone tries to trick it?", "What does it get wrong?"];

export default function AskTheCards({ modelIds, openDrawer }: { modelIds: string[]; openDrawer: (t: DrawerTarget) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [passages, setPassages] = useState<Passage[] | null>(null);
  const [error, setError] = useState("");
  const [asked, setAsked] = useState("");
  const [chunksReady, setChunksReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const evidenceIds = useMemo(() => {
    const s = new Set<string>();
    for (const m of MODELS) {
      for (const d of DIMS) for (const e of m.dims[d].evidence) if (e.chunk_id) s.add(e.chunk_id);
      for (const o of Object.values(m.overrides || {})) for (const e of o.evidence) if (e.chunk_id) s.add(e.chunk_id);
      for (const e of m.policy.evidence) if (e.chunk_id) s.add(e.chunk_id);
    }
    return s;
  }, []);
  const isValid = (id: string) => evidenceIds.has(id) || (chunksReady && hasChunk(id));

  const modelForChunk = (id: string, docId?: string, makerKey?: string) => {
    for (const m of MODELS) if (dimForChunk(m, id)) return m;
    const c = chunkById(id);
    const doc = docId || c?.doc_id;
    const mk = makerKey || c?.maker;
    return MODELS.find((m) => m.card.doc_id === doc) || MODELS.find((m) => modelIds.includes(m.id) && m.maker === mk) || MODELS.find((m) => m.maker === mk);
  };
  const cite = (id: string, docId?: string, makerKey?: string) => {
    const model = modelForChunk(id, docId, makerKey);
    const dim = model ? dimForChunk(model, id) : undefined;
    const code = model?.overrides?.code;
    const evidence = model && dim ? [...model.dims[dim].evidence, ...(code?.evidence || []), ...model.policy.evidence].find((e) => e.chunk_id === id) : undefined;
    const dimScore = model && dim ? (code && code.evidence.some((e) => e.chunk_id === id) ? code : model.dims[dim]) : undefined;
    openDrawer({ model, dim, evidence, chunkId: id, dimScore });
  };

  async function ask(question: string) {
    const qq = question.trim();
    if (!qq || busy) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true); setError(""); setText(""); setPassages(null); setAsked(qq);
    loadChunks().then(() => setChunksReady(true));
    try {
      const res = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: qq, modelIds }), signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const out = await readAnswer(res, (acc) => setText(acc));
      if (out.passages) { setPassages(out.passages); setText(out.text || ""); }
      else setText(out.text);
    } catch {
      if (!ctrl.signal.aborted) setError("We could not reach the cards just now. Try again in a moment.");
    } finally {
      if (!ctrl.signal.aborted) setBusy(false);
    }
  }

  const hasAnswer = Boolean(text.trim()) || (passages && passages.length > 0) || error || (asked && !busy);

  return (
    <div style={{ marginTop: 24, background: "#17706B", color: "#FFFFFF", borderRadius: 26, padding: "28px 32px" }}>
      <style>{`.cc-ask::placeholder{color:#BFE0DD;opacity:1}`}</style>
      <h3 style={{ fontSize: 26 }}>Ask the small print anything</h3>
      <p style={{ fontSize: 15, color: "#DCEFED", margin: "8px 0 18px" }}>Answers come only from those {MODELS.length} documents. If they do not cover it, we say so.</p>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input className="cc-ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Does it train on my customers' messages?" aria-label="Ask the documents a question" style={css("flex:1 1 320px;min-height:52px;padding:16px 20px;font-size:16px;border:none;border-radius:999px;background:#0F5A56;color:#FFFFFF;")} />
        <button type="submit" disabled={busy} className="grow" style={css("background:#FFC24B;color:#40300A;border:none;border-radius:999px;padding:16px 30px;font-size:16px;font-weight:800;cursor:pointer;transition:transform .18s cubic-bezier(.34,1.56,.64,1);" + (busy ? "animation:v3-blink 1.2s ease-in-out infinite;" : ""))}>{busy ? "Reading…" : "Ask"}</button>
      </form>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {CHIPS.map((c) => (
          <button key={c} type="button" onClick={() => { setQ(c); ask(c); }} className="tint-teal" style={css("background:transparent;border:1px solid #3D8D88;border-radius:999px;padding:9px 17px;min-height:44px;font-size:14px;color:#E4F2F1;cursor:pointer;transition:background .18s ease;")}>{c}</button>
        ))}
      </div>

      {hasAnswer && (
        <div style={{ marginTop: 18, background: "#0F5A56", borderRadius: 18, padding: "18px 20px", fontSize: 16, lineHeight: 1.65, animation: "v3-fade .3s ease-out both" }} aria-live="polite">
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#BFE0DD", marginBottom: 8 }}>{asked}</div>
          {error && <p style={{ margin: 0, color: "#FFFFFF" }}>{error}</p>}
          {!error && text.trim() && !passages && <CitedText text={text} isValid={isValid} onCite={(id) => cite(id)} onDark color="#FFFFFF" />}
          {!error && passages && (
            <div>
              <p style={{ margin: "0 0 12px", fontWeight: 700, color: "#FFFFFF" }}>{passages.length ? "Here is what the cards say" : "The cards we have do not cover that."}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {passages.slice(0, 6).map((p) => (
                  <div key={p.id} style={{ background: "#0C4D4A", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <MakerTile makerKey={p.maker} size={26} />
                    <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#BFE0DD" }}>{maker(p.maker).name}{p.page ? " · page " + p.page : ""}{p.section ? " · " + p.section : ""}</div>
                      <div style={{ fontSize: 15, lineHeight: 1.55, color: "#FFFFFF", marginTop: 4, overflowWrap: "anywhere" }}>{p.text.length > 420 ? p.text.slice(0, 420) + "…" : p.text}</div>
                      <button type="button" onClick={() => cite(p.id, p.doc_id, p.maker)} style={css("background:none;border:none;padding:10px 0;margin:-4px 0 -10px;font-size:13px;font-weight:700;color:#FFC24B;text-decoration:underline;cursor:pointer;min-height:44px;")}>show me where</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!error && !text.trim() && !passages && !busy && <p style={{ margin: 0, color: "#FFFFFF" }}>The cards we have do not cover that.</p>}
        </div>
      )}
    </div>
  );
}
