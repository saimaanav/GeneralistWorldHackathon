import scoresJson from "../../data/scores.resolved.json";
import sourcesJson from "../../data/sources.json";
import statsJson from "../../data/generated/stats.json";
import personasJson from "../../data/personas.json";
import type { Answers, DimKey, Model, Status } from "./types";
import { DIMS } from "./types";
import { coverageOf } from "./scoring";
import { maker } from "./proto";

export interface Persona { id: string; mark: string; name: string; blurb: string; markBg: string; answers: Answers }
export interface SourceDoc { doc_id: string; file: string; title: string; maker: string; type: string; url: string; published: string }
export interface Stats { generated: string; docs: Record<string, { pages: number; chunks: number; kind: string; chars: number }>; totalPages: number; totalChunks: number }

const REQUIRED: (keyof Model)[] = ["id", "display_name", "maker", "tier", "deployment", "price", "card", "policy", "dims"];

function loadModels(): Model[] {
  const raw = (scoresJson as { models?: unknown[] }).models || [];
  const out: Model[] = [];
  for (const m of raw) {
    const ok = m && typeof m === "object" && REQUIRED.every((k) => k in (m as object)) && DIMS.every((d) => (m as Model).dims[d]);
    if (ok) out.push(m as Model);
    else console.warn("[cardcompass] skipping malformed model entry", (m as { id?: string })?.id);
  }
  return out;
}

export const DATA_VERSION: string = (scoresJson as { version?: string }).version || "";
export const MODELS: Model[] = loadModels();
export const SOURCES: SourceDoc[] = (sourcesJson as { docs: SourceDoc[] }).docs;
export const STATS: Stats = statsJson as Stats;
export const PERSONAS: Persona[] = personasJson as Persona[];

export function modelById(id: string): Model | undefined { return MODELS.find((m) => m.id === id); }
export function makerName(key: string): string { return maker(key).name; }
export function makerLetter(key: string): string { return maker(key).letter; }

/** Hero race: share of the five checks each maker publishes, best first. */
export function race(): { model: Model; pct: number; note: string }[] {
  return MODELS.map((m) => ({ model: m, pct: coverageOf(m), note: m.one_liner })).sort((a, b) => b.pct - a.pct || a.model.display_name.localeCompare(b.model.display_name));
}

/** Pillar mini charts: every model's value and status on one dimension, in race order. */
export function pillarBars(dim: DimKey): { model: Model; value: number; status: Status }[] {
  return race().map(({ model }) => ({ model, value: model.dims[dim].score ?? 0, status: model.dims[dim].status }));
}

/** Stacked coverage: published / described / silent as percentages of the five checks. */
export function stacks(): { model: Model; published: number; described: number; silent: number }[] {
  return race().map(({ model }) => {
    let pub = 0, desc = 0, sil = 0;
    for (const d of DIMS) {
      const s = model.dims[d].status;
      if (s === "reported" || s === "third_party") pub++; else if (s === "inferred") desc++; else sil++;
    }
    return { model, published: Math.round((pub / 5) * 100), described: Math.round((desc / 5) * 100), silent: Math.round((sil / 5) * 100) };
  });
}

/** Pages read per maker, for the loading screen and stats band. */
export function makerPages(): { maker: string; pages: number }[] {
  const acc = new Map<string, number>();
  for (const d of SOURCES) acc.set(d.maker, (acc.get(d.maker) || 0) + (STATS.docs[d.doc_id]?.pages || 0));
  return [...acc.entries()].map(([maker, pages]) => ({ maker, pages })).sort((a, b) => b.pages - a.pages);
}

export function footnoteFor(dim: DimKey): string {
  const n = MODELS.length;
  const missing = MODELS.filter((m) => m.dims[dim].status === "missing").length;
  const inferred = MODELS.filter((m) => m.dims[dim].status === "inferred").length;
  if (dim === "privacy") return `All ${n} say something. ${MODELS.filter((m) => ["available", "on_request"].includes(m.policy.zdr)).length} let you switch retention off.`;
  if (missing) return `${missing} of ${n} makers publish nothing here.`;
  if (inferred) return `${inferred} makers describe it without publishing rates.`;
  return `Every maker publishes a number here.`;
}
