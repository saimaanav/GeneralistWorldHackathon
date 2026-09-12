import { describe, it, expect } from "vitest";
import { rankModels, MISSING_PRIOR } from "../src/lib/scoring";
import { answersToProfile, recommend, matchOptions, stepById, EMPTY_ANSWERS } from "../src/lib/questionnaire";
import type { Model, DimScore, Answers } from "../src/lib/types";

const dim = (score: number | null, status: DimScore["status"], metric = "test"): DimScore => ({ score, status, metric, evidence: [] });
const base = (id: string, over: Partial<Model> = {}): Model => ({
  id, display_name: id, maker: "other", tier: "flagship", deployment: "api", api_id: id,
  price: { input: 1, output: 5, note: "", band: "low" }, context: "1M", data_location: "US",
  card: { doc_id: id, url: "", type: "system_card", published: "", retrieved: "" }, status: "reviewed",
  one_liner: "", next_step: "",
  policy: { trains_on_inputs_by_default: "false", surface: "API", zdr: "available", retention: "30 days", baa: true, evidence: [] },
  dims: { performance: dim(80, "reported"), truthfulness: dim(80, "reported"), privacy: dim(80, "reported"), fairness: dim(80, "reported"), tamper: dim(80, "reported") },
  ...over,
});

const rosa: Answers = { business: "hospitality", jobs: ["customer_messages", "marketing"], rank: ["tamper", "cost", "truthfulness", "performance", "privacy", "fairness"], audience: "customers_direct", data: ["contacts"], reach: ["public"], decisions: "no" };

describe("profile", () => {
  it("builds Rosa's weights from the ranking plus deltas and normalises", () => {
    const p = answersToProfile(rosa);
    const sum = Object.values(p.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(p.weights.tamper).toBeGreaterThan(p.weights.truthfulness);
    expect(p.weights.truthfulness).toBeGreaterThan(p.weights.fairness);
    expect(p.tierAdj).toEqual({ efficient: 5, flagship: -5 });
    expect(p.flags.customerFacing).toBe(true);
    expect(p.flags.publicInput).toBe(true);
    expect(p.flags.regulated).toBe(false);
  });
  it("recommends options from earlier answers", () => {
    const r = recommend({ ...EMPTY_ANSWERS, business: "health" });
    expect(r.byStep.data).toContain("sensitive");
    expect(r.preset).toBe("privacy_first");
    const r2 = recommend({ ...EMPTY_ANSWERS, jobs: ["hiring"] });
    expect(r2.byStep.decisions).toContain("yes");
  });
  it("matches typed text to an option", () => {
    const step = stepById("business")!;
    expect(matchOptions(step, "physio")[0].id).toBe("health");
    expect(matchOptions(step, "bakery")[0].id).toBe("hospitality");
    expect(matchOptions(stepById("jobs")!, "answer instagram dms")[0].id).toBe("customer_messages");
  });
});

describe("ranking", () => {
  it("penalises a missing metric twice: prior and coverage", () => {
    const p = answersToProfile(rosa);
    const full = base("full");
    const gap = base("gap", { dims: { ...base("x").dims, fairness: dim(null, "missing") } });
    const { list } = rankModels(p, [gap, full]);
    const rFull = list.find((r) => r.model.id === "full")!, rGap = list.find((r) => r.model.id === "gap")!;
    expect(rGap.dims.fairness.s).toBe(MISSING_PRIOR);
    expect(rGap.dims.fairness.c).toBe(0);
    expect(rGap.trust).toBeLessThan(rFull.trust);
    expect(rGap.final).toBeLessThan(rFull.final);
    expect(list[0].model.id).toBe("full");
  });
  it("rules out an API model whose training policy is unknown when regulated data is ticked", () => {
    const p = answersToProfile({ ...rosa, data: ["payments"] });
    const unknown = base("unknown", { policy: { ...base("u").policy, trains_on_inputs_by_default: "unknown" } });
    const open = base("open", { deployment: "open_weights", policy: { ...base("o").policy, trains_on_inputs_by_default: "unknown", zdr: "self_host" } });
    const { list } = rankModels(p, [unknown, open, base("fine")]);
    expect(list.find((r) => r.model.id === "unknown")!.partition).toBe("excluded");
    expect(list.find((r) => r.model.id === "open")!.partition).toBe("main");
    expect(list.find((r) => r.model.id === "fine")!.partition).toBe("main");
    expect(list[0].partition).toBe("main");
  });
  it("never returns an empty main list", () => {
    const p = answersToProfile({ ...rosa, data: ["payments"] });
    const a = base("a", { policy: { ...base("a").policy, trains_on_inputs_by_default: "true" } });
    const b = base("b", { policy: { ...base("b").policy, trains_on_inputs_by_default: "unknown" } });
    const res = rankModels(p, [a, b]);
    expect(res.neverEmpty).toBe(true);
    expect(res.list.every((r) => r.partition === "demoted")).toBe(true);
  });
  it("keeps a pending model out of first place and demotes for missing tamper when the public can type", () => {
    const p = answersToProfile(rosa);
    const pend = base("pend", { dims: { ...base("x").dims, performance: dim(null, "pending") } });
    const strong = base("strong");
    const quiet = base("quiet", { dims: { ...base("x").dims, tamper: dim(null, "missing") } });
    const { list } = rankModels(p, [pend, strong, quiet]);
    expect(list[0].model.id).toBe("strong");
    expect(list.find((r) => r.model.id === "quiet")!.partition).toBe("demoted");
    expect(list.find((r) => r.model.id === "pend")!.pending).toBe(true);
  });
});
