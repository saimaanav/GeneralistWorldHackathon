import type { DimKey, DimResult, DimScore, Model, Profile, RankResult, Ranked, Status } from "./types";
import { DIMS } from "./types";

export const MISSING_PRIOR = 35;
export const TRUST_FLOOR = 0.75;
export const COVERAGE: Record<Status, number> = { reported: 1, third_party: 0.8, inferred: 0.5, missing: 0, pending: 0 };

/** The DimScore a model's check is scored from: the base dimension, or `overrides.code` when the website task applies. */
export function effectiveDim(model: Model, dim: DimKey, tasks: string[]): DimScore | undefined {
  const d = model.dims[dim];
  if (dim === "performance" && tasks.includes("website") && model.overrides?.code && model.overrides.code.status !== "missing" && model.overrides.code.status !== "pending") {
    return model.overrides.code;
  }
  return d;
}

function dimFor(model: Model, dim: DimKey, tasks: string[]): { score: number | null; status: Status; label: string; value?: string; metric?: string; source?: DimScore } {
  const d = effectiveDim(model, dim, tasks);
  if (!d) return { score: null, status: "missing", label: "not reported" };
  const label = d === model.dims[dim] ? d.metric || "" : d.metric || "code benchmark";
  return { score: d.score, status: d.status, label, value: d.value, metric: d.metric, source: d };
}

/** Unweighted share of the five checks the maker publishes (used by the race and pillars). */
export function coverageOf(model: Model): number {
  let n = 0;
  for (const dim of DIMS) n += COVERAGE[model.dims[dim]?.status || "missing"];
  return Math.round((n / DIMS.length) * 100);
}

export function scoreModel(model: Model, profile: Profile): Ranked {
  const dims = {} as Record<DimKey, DimResult>;
  let wSum = 0, composite = 0, trust = 0;
  let pending = false;
  for (const dim of DIMS) {
    const r = dimFor(model, dim, profile.tasks);
    const w = profile.weights[dim];
    if (r.status === "pending") {
      pending = true;
      dims[dim] = { s: 0, c: 0, status: "pending", score: null, label: r.label, value: r.value, metric: r.metric, source: r.source };
      continue;
    }
    const s = r.status === "missing" || r.score === null ? MISSING_PRIOR : r.score;
    const c = COVERAGE[r.status];
    dims[dim] = { s, c, status: r.status, score: r.score, label: r.label, value: r.value, metric: r.metric, source: r.source };
    wSum += w;
    composite += w * s;
    trust += w * c;
  }
  if (wSum > 0) { composite /= wSum; trust /= wSum; }
  trust *= 100;
  const tierAdj = model.tier === "efficient" ? profile.tierAdj.efficient : model.tier === "flagship" ? profile.tierAdj.flagship : 0;
  const final = Math.max(0, Math.min(100, composite * (TRUST_FLOOR + (1 - TRUST_FLOOR) * (trust / 100)) + tierAdj));

  const reasons: string[] = [];
  let partition: Ranked["partition"] = "main";
  const isApi = model.deployment !== "open_weights";
  const trains = model.policy.trains_on_inputs_by_default;

  // Filter A: regulated data and the API trains on inputs (or will not say).
  if (profile.flags.regulated && isApi && (trains === "true" || trains === "unknown")) {
    partition = "excluded";
    reasons.push(trains === "true"
      ? "its " + (model.policy.surface || "API") + " uses your inputs for training by default"
      : "the maker does not state whether your inputs are used for training");
  }
  // Filter A2: health, legal or HR data needs a zero-retention route.
  if (partition === "main" && profile.flags.strict && model.deployment !== "open_weights") {
    if (model.policy.zdr === "not_available") { partition = "demoted"; reasons.push("it cannot be run with zero data retention, which health, legal or HR records call for"); }
    else if (model.policy.zdr === "unknown") { partition = "demoted"; reasons.push("the maker has not published how long it keeps your data"); }
  }
  // Filter B: the public can type into it or it can act, and tamper testing is missing.
  if (partition === "main" && profile.flags.publicInput && dims.tamper.status === "missing") {
    partition = "demoted";
    reasons.push("the public can reach it, and the maker publishes nothing about whether it can be talked off script");
  }
  // Filter C: health data or decisions about people, and truthfulness is missing.
  if (partition === "main" && (profile.flags.health || profile.flags.decisions) && dims.truthfulness.status === "missing") {
    partition = "demoted";
    reasons.push("the stakes are high for you, and the maker publishes no accuracy testing at all");
  }

  return { model, final: round1(final), composite: round1(composite), trust: round1(trust), coverage: coverageOf(model), partition, reasons, dims, pending };
}

export function rankModels(profile: Profile, models: Model[]): RankResult {
  const scored = models.map((m) => scoreModel(m, profile));
  let neverEmpty = false;
  if (scored.length && scored.every((r) => r.partition === "excluded")) {
    neverEmpty = true;
    for (const r of scored) r.partition = "demoted";
  }
  const order: Record<Ranked["partition"], number> = { main: 0, demoted: 1, excluded: 2 };
  const priceOf = (r: Ranked) => (r.model.price.input ?? 99) * 3 + (r.model.price.output ?? 99);
  scored.sort((a, b) =>
    order[a.partition] - order[b.partition] ||
    Number(a.pending) - Number(b.pending) ||
    b.final - a.final ||
    b.trust - a.trust ||
    priceOf(a) - priceOf(b));
  return { list: scored, neverEmpty };
}

function round1(n: number) { return Math.round(n * 10) / 10; }
