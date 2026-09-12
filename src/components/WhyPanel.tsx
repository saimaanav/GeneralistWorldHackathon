"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { css, ACCENT } from "@/lib/proto";
import { explainTemplate } from "@/lib/explainTemplate";
import type { Answers, DimKey, Interpretation, Profile, Ranked } from "@/lib/types";
import { DIMS } from "@/lib/types";
import DoThisFirst from "./DoThisFirst";
import { loadChunks, hasChunk, chunkById, type DrawerTarget } from "./EvidenceDrawer";

export const PILL = "font:inherit;font-weight:700;color:#0F4F4B;background:#E6F2F0;border:none;border-radius:7px;padding:1px 7px;cursor:pointer;transition:background .18s ease;";

export interface Passage { id: string; doc_id: string; page: number | null; section: string; text: string; maker: string }
export interface Answer { mode: string; text: string; passages?: Passage[] }

/** Read /api/explain or /api/ask in any of its shapes: JSON, one chunk, many chunks. */
export async function readAnswer(res: Response, onChunk?: (acc: string) => void): Promise<Answer> {
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const asJson = (j: unknown): Answer | null => {
    if (!j || typeof j !== "object") return null;
    const o = j as { mode?: string; text?: string; passages?: Passage[] };
    if (typeof o.text !== "string" && !Array.isArray(o.passages)) return null;
    return { mode: o.mode || (Array.isArray(o.passages) ? "passages" : "claude"), text: typeof o.text === "string" ? o.text : "", passages: Array.isArray(o.passages) ? o.passages : undefined };
  };
  if (ct.includes("application/json")) {
    const j = asJson(await res.json());
    if (!j) throw new Error("bad json");
    return j;
  }
  if (!res.body) {
    const t = await res.text();
    return { mode: "claude", text: t };
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let acc = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += dec.decode(value, { stream: true });
    onChunk?.(acc);
  }
  acc += dec.decode();
  const trimmed = acc.trim();
  if (trimmed.startsWith("{")) {
    try { const j = asJson(JSON.parse(trimmed)); if (j) return j; } catch { /* plain text that happens to start with a brace */ }
  }
  return { mode: (res.headers.get("x-mode") || "claude").toLowerCase(), text: acc };
}

/* ---------- [c:chunk_id] markers become pills ---------- */
const CITE = /\[c:([^\]\s]+)\]/g;

function inline(text: string, keyBase: string, isValid: (id: string) => boolean, onCite: (id: string) => void, onDark: boolean): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, k = 0;
  const pill = PILL + (onDark ? "color:#0F4F4B;background:#E6F2F0;" : "");
  const pushText = (s: string) => {
    if (!s) return;
    // light markdown: **bold**
    const parts = s.split(/\*\*/);
    parts.forEach((p, i) => { if (!p) return; out.push(i % 2 === 1 ? <strong key={keyBase + "-" + k++} style={{ fontWeight: 700 }}>{p}</strong> : <span key={keyBase + "-" + k++}>{p}</span>); });
  };
  for (const m of text.matchAll(CITE)) {
    const at = m.index ?? 0;
    pushText(text.slice(last, at).replace(/\s+$/, (ws) => (isValid(m[1]) ? ws : "")));
    if (isValid(m[1])) out.push(<button key={keyBase + "-" + k++} type="button" onClick={() => onCite(m[1])} style={css(pill)}>see the quote</button>);
    last = at + m[0].length;
  }
  pushText(text.slice(last));
  return out;
}

export function CitedText({ text, isValid, onCite, onDark = false, color = "#3F3A48" }: { text: string; isValid: (id: string) => boolean; onCite: (id: string) => void; onDark?: boolean; color?: string }) {
  const paras = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((p) => p.replace(/^\s*[-*]\s+/gm, "").trim()).filter(Boolean);
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} style={{ margin: "0 0 12px", textWrap: "pretty", color }}>{inline(p, "p" + i, isValid, onCite, onDark)}</p>
      ))}
    </>
  );
}

/** Which check a chunk belongs to, judging by the model's own evidence lists. */
export function dimForChunk(model: Ranked["model"], chunkId: string): DimKey | undefined {
  for (const d of DIMS) if (model.dims[d].evidence.some((e) => e.chunk_id === chunkId)) return d;
  if (model.policy.evidence.some((e) => e.chunk_id === chunkId)) return "privacy";
  return undefined;
}

export default function WhyPanel({ ranked, profile, rankNo, answers, interpretation, openDrawer }: {
  ranked: Ranked;
  profile: Profile;
  rankNo: number;
  answers: Answers;
  interpretation: Interpretation | null;
  openDrawer: (t: DrawerTarget) => void;
}) {
  const model = ranked.model;
  const paras = useMemo(() => explainTemplate(ranked, profile, rankNo), [ranked, profile, rankNo]);
  const [mode, setMode] = useState<"template" | "writing" | "claude">("template");
  const [text, setText] = useState("");
  const [chunksReady, setChunksReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const evidenceIds = useMemo(() => {
    const s = new Set<string>();
    for (const d of DIMS) for (const e of model.dims[d].evidence) if (e.chunk_id) s.add(e.chunk_id);
    for (const e of model.policy.evidence) if (e.chunk_id) s.add(e.chunk_id);
    return s;
  }, [model]);
  const isValid = (id: string) => evidenceIds.has(id) || (chunksReady && hasChunk(id));

  const cite = (id: string) => {
    const dim = dimForChunk(model, id);
    const evidence = dim ? [...model.dims[dim].evidence, ...model.policy.evidence].find((e) => e.chunk_id === id) : undefined;
    const c = chunkById(id);
    openDrawer({ model, dim, evidence, chunkId: id });
    void c;
  };

  async function refine() {
    if (mode === "writing") return;
    if (mode === "claude") { setMode("template"); return; }
    setMode("writing");
    setText("");
    loadChunks().then(() => setChunksReady(true));
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ modelId: model.id, answers, interpretation }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(String(res.status));
      const out = await readAnswer(res, (acc) => setText(acc));
      if (out.mode === "template" || !out.text.trim()) { setMode("template"); return; }
      setText(out.text);
      setMode("claude");
    } catch {
      if (!ctrl.signal.aborted) setMode("template");
    }
  }

  const writing = mode === "writing";
  const showClaude = mode === "claude" || (writing && text.trim().length > 0);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>Why we picked it</span>
        <button
          type="button"
          onClick={refine}
          aria-busy={writing}
          style={css("font-size:13px;font-weight:700;border-radius:999px;padding:6px 13px;min-height:36px;cursor:pointer;border:2px solid " + ACCENT + ";color:" + (mode === "claude" ? "#FFFFFF" : ACCENT) + ";background:" + (mode === "claude" ? ACCENT : "#FFFFFF") + ";" + (writing ? "animation:v3-blink 1.2s ease-in-out infinite;" : ""))}
        >
          {writing ? "Writing…" : mode === "claude" ? "Back to the short version" : "Explain it for my business"}
        </button>
      </div>
      <div style={{ fontSize: 16, lineHeight: 1.65, color: "#3F3A48" }}>
        {showClaude ? (
          <div style={{ animation: "v3-fade .3s ease-out both" }}>
            <CitedText text={text} isValid={isValid} onCite={cite} />
            {mode === "claude" && <div style={{ fontSize: 13, color: "#565064", margin: "-4px 0 12px" }}>Written for your answers from the maker&apos;s own documents. Every pill opens the quote it rests on.</div>}
          </div>
        ) : (
          paras.map((p, i) => (
            <p key={i} style={{ margin: "0 0 12px", textWrap: "pretty" }}>
              {p.before}
              <button type="button" onClick={() => openDrawer({ model, dim: p.dim, evidence: p.dim ? model.dims[p.dim].evidence[0] : undefined })} style={css(PILL)}>{p.pill}</button>
              {p.after}
            </p>
          ))
        )}
      </div>
      <DoThisFirst text={model.next_step} />
    </div>
  );
}
