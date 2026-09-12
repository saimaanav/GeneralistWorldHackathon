"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Q, DEFAULT_RANK, EXCLUSIVE, TEXT_URL_MAX, answersToParams, paramsToAnswers, recommend, matchOptions, answersToProfile, optionLabel, type Step } from "@/lib/questionnaire";
import type { Answers } from "@/lib/types";
import { css, ACCENT } from "@/lib/proto";
import TypeToMatch from "./TypeToMatch";
import QuestionStep from "./QuestionStep";
import RankStep, { type PresetPill } from "./RankStep";
import UploadField from "./UploadField";

export const DOC_KEY = "cardcompass.docText";
/** The whole free-text answer. The URL only carries the first TEXT_URL_MAX characters. */
export const TEXT_KEY = "cardcompass.text";
const TOTAL = 8;
const SHOWN_PRESETS = ["safety_first", "best_results", "balanced"];

type SingleKey = "business" | "audience" | "decisions";
type MultiKey = "jobs" | "data" | "reach";

function clampStep(raw: string | null): number {
  const n = parseInt(raw || "1", 10);
  return Number.isFinite(n) && n >= 1 && n <= TOTAL ? n : 1;
}

export default function Quiz() {
  const router = useRouter();
  const sp = useSearchParams();
  const persona = sp.get("persona") || "";
  const [answers, setAnswers] = useState<Answers>(() => paramsToAnswers(new URLSearchParams(sp.toString())));
  const [step, setStep] = useState<number>(() => clampStep(sp.get("step")));
  const [typed, setTyped] = useState("");
  const [rankTouched, setRankTouched] = useState<boolean>(() => paramsToAnswers(new URLSearchParams(sp.toString())).rank.length === 6);

  // A document read on an earlier visit lives in sessionStorage, keyed by name in the URL.
  // So does a long free-text answer: the URL holds the first TEXT_URL_MAX characters, sessionStorage the whole thing.
  useEffect(() => {
    try {
      if (answers.docName && !answers.docText) {
        const t = sessionStorage.getItem(DOC_KEY);
        if (t) setAnswers((a) => ({ ...a, docText: t }));
      }
      if (answers.text && answers.text.length >= TEXT_URL_MAX) {
        const full = sessionStorage.getItem(TEXT_KEY);
        if (full && full.length > answers.text.length && full.startsWith(answers.text)) setAnswers((a) => ({ ...a, text: full }));
      }
    } catch { /* private mode */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paramsFor = (a: Answers, withStep?: number) => {
    const p = answersToParams(a);
    if (withStep) p.set("step", String(withStep));
    if (persona) p.set("persona", persona);
    return p;
  };

  // Keep the URL in step with the answers so refresh and share work.
  useEffect(() => {
    const p = paramsFor(answers, step);
    const url = "/quiz?" + p.toString();
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(window.history.state, "", url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, step, persona]);

  useEffect(() => { router.prefetch("/loading"); }, [router]);

  const current: Step = Q.steps[step - 1];
  const rec = useMemo(() => recommend(answers), [answers]);
  const businessLabel = answers.business ? optionLabel("business", answers.business).toLowerCase() : "";

  /* ---------- type to match ---------- */
  const hits = useMemo(() => (current.type === "text" ? [] : matchOptions(current, typed)), [current, typed]);
  const hasQuery = typed.trim().length > 0;
  const bestId = hasQuery && hits.length ? hits[0].id : undefined;
  const noMatch = hasQuery && hits.length === 0;
  const optionOrder = useMemo(() => {
    const ids = (current.options || []).map((o) => o.id);
    if (!hits.length) return ids;
    const pos = new Map(hits.map((h, i) => [h.id, i]));
    return [...ids].sort((a, b) => (pos.has(a) ? pos.get(a)! : 999) - (pos.has(b) ? pos.get(b)! : 999));
  }, [current, hits]);

  /* ---------- rank ---------- */
  const rankOrder = rankTouched && answers.rank.length === 6 ? answers.rank : rec.presetOrder || DEFAULT_RANK;
  const rankWeights = useMemo(() => answersToProfile({ ...answers, rank: rankOrder }).weights, [answers, rankOrder]);
  const presets: PresetPill[] = useMemo(() => {
    // A recommended preset that is already one of the shown three becomes that pill, so there is one pill per order and the active one can be found.
    const out: PresetPill[] = SHOWN_PRESETS.filter((id) => Q.presets[id]).map((id) => ({ id, label: Q.presets[id].label, order: Q.presets[id].order, recommended: rec.preset === id }));
    if (rec.presetOrder && rec.preset && !SHOWN_PRESETS.includes(rec.preset)) out.push({ id: "rec:" + rec.preset, label: Q.presets[rec.preset].label, order: rec.presetOrder, recommended: true });
    return out;
  }, [rec]);
  const activePreset = presets.find((p) => p.order.join(",") === rankOrder.join(","))?.id;
  const setRank = (order: string[]) => { setRankTouched(true); setAnswers((a) => ({ ...a, rank: order })); };

  /* ---------- picking ---------- */
  const pick = (id: string) => {
    if (current.type === "single") {
      const key = current.id as SingleKey;
      setAnswers((a) => {
        const next = a[key] === id ? undefined : id;
        // "What do you do?" only makes sense while "Something else" is the answer.
        return { ...a, [key]: next, ...(key === "business" && next !== "other" ? { businessOther: undefined } : {}) };
      });
      return;
    }
    if (current.type === "multi") {
      const key = current.id as MultiKey;
      setAnswers((a) => {
        let cur = [...a[key]];
        if (cur.includes(id)) cur = cur.filter((x) => x !== id);
        else if (EXCLUSIVE.has(id)) cur = [id];
        else {
          cur = cur.filter((x) => !EXCLUSIVE.has(x));
          cur.push(id);
          if (current.max && cur.length > current.max) cur = cur.slice(cur.length - current.max);
        }
        return { ...a, [key]: cur };
      });
    }
  };

  const selected: string[] = current.type === "single"
    ? ([answers[current.id as SingleKey]].filter(Boolean) as string[])
    : current.type === "multi" ? answers[current.id as MultiKey] : [];

  const useRecommended = () => {
    const ids = rec.byStep[current.id] || [];
    if (!ids.length) return;
    if (current.type === "single") { const key = current.id as SingleKey; setAnswers((a) => ({ ...a, [key]: ids[0] })); }
    else if (current.type === "multi") { const key = current.id as MultiKey; const max = current.max || ids.length; setAnswers((a) => ({ ...a, [key]: ids.slice(0, max) })); }
  };

  const appendTyped = () => {
    const t = typed.trim();
    if (!t) return;
    setAnswers((a) => ({ ...a, text: a.text ? a.text + "\n" + t : t }));
    setTyped("");
  };

  const onEnter = () => {
    if (bestId) {
      if (current.type === "rank") {
        const next = [bestId, ...rankOrder.filter((x) => x !== bestId)];
        setRank(next);
      } else pick(bestId);
      setTyped("");
    } else if (noMatch) appendTyped();
  };

  /* ---------- navigation ---------- */
  const goto = (n: number) => {
    if (noMatch) appendTyped(); else setTyped("");
    setStep(n);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const finish = () => {
    let a = answers;
    if (noMatch && typed.trim()) { a = { ...answers, text: answers.text ? answers.text + "\n" + typed.trim() : typed.trim() }; setAnswers(a); }
    // Results must weigh things the way the rank step said it would, even if the list was never touched.
    a = { ...a, rank: rankOrder };
    try {
      if (a.docText) sessionStorage.setItem(DOC_KEY, a.docText); else sessionStorage.removeItem(DOC_KEY);
      if (a.text) sessionStorage.setItem(TEXT_KEY, a.text); else sessionStorage.removeItem(TEXT_KEY);
    } catch { /* private mode */ }
    router.push("/loading?" + paramsFor(a).toString());
  };
  const next = () => { if (step < TOTAL) goto(step + 1); else finish(); };
  const back = () => { if (step > 1) goto(step - 1); else router.push("/"); };

  const recommendedHere = rec.byStep[current.id] || [];
  // Typed notes from earlier steps are appended to the text, so it can run past the box's own limit.
  const textLen = (answers.text || "").length;

  return (
    <div style={{ background: "#FFF8EE", padding: "26px 24px 80px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#565064" }}>Question {step} of {TOTAL}</span>
          <button type="button" onClick={finish} style={css("margin-left:auto;background:none;border:none;font-size:14px;font-weight:700;color:#17706B;text-decoration:underline;cursor:pointer;min-height:44px;padding:0 4px;")}>Skip to results</button>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: "#EFE7DA", overflow: "hidden" }} role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step}>
          <span style={css("display:block;height:100%;border-radius:999px;background:" + ACCENT + ";transition:width .5s cubic-bezier(.34,1.2,.64,1);width:" + (step / TOTAL) * 100 + "%;")} />
        </div>

        <div key={step} className="quiz-card" style={css("background:#FFFFFF;border-radius:26px;padding:34px;margin-top:22px;box-shadow:0 16px 34px rgba(22,21,28,.08);animation:v3-slide .34s cubic-bezier(.34,1.2,.64,1) both;")}>
          <h2 style={{ fontSize: 36, lineHeight: 1.1, marginBottom: 8, textWrap: "pretty" }}>{current.title}</h2>
          <p style={{ fontSize: 16, color: "#565064", margin: "0 0 24px" }}>{current.hint}</p>

          {(current.type === "single" || current.type === "multi") && (
            <>
              <TypeToMatch value={typed} onChange={setTyped} onEnter={onEnter} noMatch={noMatch} bestLabel={bestId ? optionLabel(current.id, bestId) : undefined} />
              <QuestionStep step={current} selected={selected} onPick={pick} order={optionOrder} bestId={bestId} recommended={recommendedHere} business={answers.business} onUseRecommended={useRecommended} otherText={answers.businessOther} onOtherChange={(v) => setAnswers((a) => ({ ...a, businessOther: v }))} />
            </>
          )}

          {current.type === "rank" && (
            <>
              <TypeToMatch value={typed} onChange={setTyped} onEnter={onEnter} noMatch={noMatch} bestLabel={bestId ? optionLabel("rank", bestId) : undefined} />
              <RankStep step={current} order={rankOrder} onChange={setRank} presets={presets} activePreset={activePreset} bestId={bestId} weights={rankWeights} business={answers.business} />
            </>
          )}

          {current.type === "text" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <textarea
                  value={answers.text || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, text: e.target.value }))}
                  placeholder="e.g. We are a three person bakery. I answer the same Instagram questions all day and I would like help replying without sounding like a robot."
                  aria-label="Anything else you would like to tell us"
                  aria-describedby="quiz-text-count"
                  maxLength={TEXT_URL_MAX}
                  style={css("width:100%;min-height:132px;resize:vertical;padding:16px;font-size:16px;line-height:1.5;color:#16151C;background:#FDF9F2;border:2px solid #EFE7DA;border-radius:16px;")}
                />
                <div id="quiz-text-count" style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", fontSize: 13, color: textLen > TEXT_URL_MAX ? "#8E3524" : "#565064", marginTop: 6 }}>
                  {textLen > TEXT_URL_MAX && <span>Over the limit: the first {TEXT_URL_MAX} characters go with your answers, we keep the rest on this device.</span>}
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{textLen} / {TEXT_URL_MAX}</span>
                </div>
              </div>
              <UploadField
                docName={answers.docName}
                onFile={(text, name) => {
                  try { sessionStorage.setItem(DOC_KEY, text); } catch { /* private mode */ }
                  setAnswers((a) => ({ ...a, docText: text, docName: name }));
                }}
                onRemove={() => {
                  try { sessionStorage.removeItem(DOC_KEY); } catch { /* private mode */ }
                  setAnswers((a) => ({ ...a, docText: undefined, docName: undefined }));
                }}
              />
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
          <button type="button" onClick={back} className="edge-soft" style={css("font-size:16px;font-weight:700;background:#FFFFFF;border:2px solid #EFE7DA;color:#3F3A48;border-radius:999px;padding:13px 24px;cursor:pointer;transition:border-color .18s ease;")}>Back</button>
          <button type="button" onClick={next} className="press-6" style={css("font-size:17px;font-weight:800;background:" + ACCENT + ";border:none;color:#FFFFFF;border-radius:999px;padding:16px 30px;cursor:pointer;box-shadow:0 6px 0 #0B3D3A;transition:transform .16s ease,box-shadow .16s ease;")}>
            {step === TOTAL ? "Show my matches →" : "Next"}
          </button>
          <span style={{ marginLeft: "auto", fontSize: 14, color: "#565064" }}>{current.reassure}</span>
        </div>
      </div>
    </div>
  );
}
