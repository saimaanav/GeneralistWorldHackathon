"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MODELS, PERSONAS } from "@/lib/data";
import { answersToParams, answersToProfile, paramsToAnswers } from "@/lib/questionnaire";
import { rankModels } from "@/lib/scoring";
import type { Answers, Interpretation } from "@/lib/types";
import { css, ACCENT } from "@/lib/proto";
import WeightsPanel from "./WeightsPanel";
import ResultCard from "./ResultCard";
import SetAsideStrip from "./SetAsideStrip";
import AskTheCards from "./AskTheCards";
import EvidenceDrawer, { type DrawerTarget } from "./EvidenceDrawer";

const DOC_KEY = "cardcompass.docText";
const INTERPRET_TIMEOUT = 8000;

function isEmpty(a: Answers): boolean {
  return !a.business && !a.jobs.length && !a.rank.length && !a.audience && !a.data.length && !a.reach.length && !a.decisions && !a.text;
}

export default function Results() {
  const sp = useSearchParams();
  const paramString = sp.toString();
  const personaId = sp.get("persona") || "";
  const persona = useMemo(() => PERSONAS.find((p) => p.id === personaId), [personaId]);

  const answers = useMemo<Answers>(() => {
    const a = paramsToAnswers(new URLSearchParams(paramString));
    if (persona && isEmpty(a)) return { ...persona.answers, jobs: [...persona.answers.jobs], rank: [...persona.answers.rank], data: [...persona.answers.data], reach: [...persona.answers.reach] };
    return a;
  }, [paramString, persona]);

  // The uploaded document never goes in the URL; it waits in sessionStorage.
  const [doc, setDoc] = useState<{ ready: boolean; text: string }>({ ready: false, text: "" });
  useEffect(() => {
    let t = "";
    try { t = (answers.docName ? sessionStorage.getItem(DOC_KEY) : "") || ""; } catch { /* private mode */ }
    setDoc({ ready: true, text: t });
  }, [answers.docName]);

  const description = useMemo(() => {
    const typed = answers.text || (persona ? persona.answers.text : "") || "";
    return [typed, doc.text].filter(Boolean).join("\n\n").trim();
  }, [answers.text, persona, doc.text]);

  /* ---------- interpretation, fired in parallel with the first render ---------- */
  const [interp, setInterp] = useState<Interpretation | null>(null);
  const [interpState, setInterpState] = useState<"idle" | "loading" | "done" | "off">("idle");
  const [ignore, setIgnore] = useState(false);
  useEffect(() => {
    if (!doc.ready) return;
    if (!description) { setInterp(null); setInterpState("idle"); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), INTERPRET_TIMEOUT);
    setInterpState("loading");
    fetch("/api/interpret", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: description }), signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: Partial<Interpretation> | null) => {
        if (!j || typeof j !== "object" || typeof j.summary !== "string") { setInterpState("off"); return; }
        const out: Interpretation = { summary: j.summary, weight_deltas: j.weight_deltas || {}, add_tasks: j.add_tasks || [], add_flags: j.add_flags || [], reasons: j.reasons || [], source: j.source === "claude" ? "claude" : "rules" };
        const meaningful = out.summary.trim() || Object.keys(out.weight_deltas).length || out.add_tasks.length || out.add_flags.length;
        if (!meaningful) { setInterpState("off"); return; }
        setInterp(out);
        setInterpState("done");
      })
      .catch(() => setInterpState("off"))
      .finally(() => clearTimeout(timer));
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [description, doc.ready]);

  const activeInterp = ignore ? null : interp;
  const profile = useMemo(() => answersToProfile(answers, activeInterp), [answers, activeInterp]);
  const rank = useMemo(() => rankModels(profile, MODELS), [profile]);

  const main = rank.list.filter((r) => r.partition === "main");
  const demoted = rank.list.filter((r) => r.partition === "demoted");
  const excluded = rank.list.filter((r) => r.partition === "excluded");
  const shown = main.length ? main : demoted;
  const rankNoOf = (id: string) => rank.list.findIndex((r) => r.model.id === id) + 1;

  /* ---------- view state ---------- */
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 80); return () => clearTimeout(t); }, []);
  const [showNumbers, setShowNumbers] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined);
  const expandedId = expanded === undefined ? shown[0]?.model.id ?? null : expanded;
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);
  const openDrawer = useCallback((t: DrawerTarget) => setDrawer(t), []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  const visible = showAll ? shown : shown.slice(0, 3);
  const quizHref = "/quiz?" + (() => { const p = answersToParams(answers); if (personaId) p.set("persona", personaId); return p.toString(); })();
  const name = persona ? persona.name : (answers.businessOther ? answers.businessOther.trim() : "your business");
  const recap = (activeInterp && activeInterp.source === "claude" && activeInterp.summary.trim()) ? activeInterp.summary : (profile.summary || "Tell us a little about your business and we will rank the models for it.") + (activeInterp && activeInterp.source === "rules" && activeInterp.summary.trim() ? " " + activeInterp.summary : "");

  return (
    <div style={{ background: "#FFF8EE", padding: "24px 24px 90px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>

        <div style={css("background:#16151C;color:#FFF8EE;border-radius:28px;padding:30px 32px;animation:v3-rise .45s ease-out both;")}>
          <div style={{ display: "flex", gap: 30, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "1 1 400px", minWidth: 280 }}>
              <h2 style={{ fontSize: 34, lineHeight: 1.1 }}>{MODELS.length} models, ranked for {name}</h2>
              <p style={{ fontSize: 17, lineHeight: 1.55, color: "#BEB8C9", margin: "10px 0 0", maxWidth: "54ch", textWrap: "pretty" }}>{recap}</p>
              {interpState === "loading" && (
                <p style={{ fontSize: 14, color: "#9A93AC", margin: "10px 0 0", animation: "v3-blink 1.2s ease-in-out infinite" }}>Reading your description too. The ranking will settle in a moment.</p>
              )}
              {interp && interpState === "done" && (
                <p style={{ fontSize: 14, color: "#BEB8C9", margin: "10px 0 0" }}>
                  {ignore ? "Your description is set aside. The ranking uses your eight answers only." : (interp.source === "claude" ? "We read your description and adjusted the weights." : "We picked up keywords from your description and adjusted the weights.")}
                  {!ignore && interp.reasons.length > 0 && " " + interp.reasons.slice(0, 2).join(" ")}
                </p>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                <Link href={quizHref} className="edge-ink" style={css("display:inline-flex;align-items:center;background:transparent;border:2px solid #3A3747;border-radius:999px;padding:10px 20px;font-size:15px;font-weight:700;color:#FFF8EE;text-decoration:none;transition:border-color .18s ease;")}>Change my answers</Link>
                <button type="button" onClick={() => setShowNumbers((s) => !s)} aria-pressed={showNumbers} style={css("border-radius:999px;padding:10px 20px;font-size:15px;font-weight:700;cursor:pointer;transition:background .18s ease;border:2px solid " + (showNumbers ? ACCENT : "#3A3747") + ";background:" + (showNumbers ? ACCENT : "transparent") + ";color:#FFF8EE;")}>
                  {showNumbers ? "Hide the technical numbers" : "Show the technical numbers"}
                </button>
                {interp && interpState === "done" && (
                  <button type="button" onClick={() => setIgnore((i) => !i)} aria-pressed={ignore} style={css("border-radius:999px;padding:10px 20px;font-size:15px;font-weight:700;cursor:pointer;transition:background .18s ease;border:2px solid " + (ignore ? "#FFC24B" : "#3A3747") + ";background:" + (ignore ? "#FFC24B" : "transparent") + ";color:" + (ignore ? "#40300A" : "#FFF8EE") + ";")}>
                    {ignore ? "Use my description" : "Ignore my description"}
                  </button>
                )}
              </div>
            </div>
            <WeightsPanel weights={profile.weights} notes={profile.notes} on={on} />
          </div>
        </div>

        {rank.neverEmpty && (
          <div role="status" style={css("margin-top:16px;background:#FCEFD4;color:#7A5410;border-radius:18px;padding:14px 18px;font-size:15px;font-weight:700;line-height:1.5;animation:v3-fade .3s ease-out both;")}>
            No model in our set confirms it does not train on your data; showing all with warnings.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 20 }}>
          {visible.map((r, i) => (
            <ResultCard
              key={r.model.id}
              ranked={r}
              idx={i}
              rankNo={rankNoOf(r.model.id)}
              isTop={i === 0}
              expanded={expandedId === r.model.id}
              onToggle={() => setExpanded(expandedId === r.model.id ? null : r.model.id)}
              on={on}
              showNumbers={showNumbers}
              profile={profile}
              answers={answers}
              interpretation={activeInterp}
              openDrawer={openDrawer}
            />
          ))}
          {shown.length > 3 && !showAll && (
            <button type="button" onClick={() => setShowAll(true)} className="edge" style={css("align-self:center;background:#FFFFFF;border:2px solid #EFE7DA;border-radius:999px;padding:13px 26px;font-size:15px;font-weight:700;color:#3F3A48;cursor:pointer;transition:border-color .18s ease;box-shadow:0 10px 24px rgba(22,21,28,.06);")}>
              Show all {shown.length} models
            </button>
          )}
          {shown.length === 0 && (
            <div style={{ background: "#FFFFFF", borderRadius: 26, padding: "28px 30px", fontSize: 16, color: "#3F3A48" }}>Nothing in our set fits those answers. Loosen one of them and try again.</div>
          )}
        </div>

        {!rank.neverEmpty && (
          <SetAsideStrip title="Set aside for you" sub="A poor fit for the way you plan to use it, so we will not rank them above models that show their work." items={demoted} openDrawer={openDrawer} />
        )}
        <SetAsideStrip title="Ruled out for your data" sub="You handle payment, health, legal or HR records, and these makers either train on your inputs or will not say." items={excluded} openDrawer={openDrawer} />

        <AskTheCards modelIds={shown.map((r) => r.model.id)} openDrawer={openDrawer} />
      </div>

      <EvidenceDrawer target={drawer} onClose={closeDrawer} />
    </div>
  );
}
