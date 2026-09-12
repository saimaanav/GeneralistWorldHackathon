import { describe, it, expect } from "vitest";
import { rankModels, MISSING_PRIOR } from "../src/lib/scoring";
import { answersToProfile, recommend, matchOptions, stepById, summarize, effectiveRank, Q, EMPTY_ANSWERS } from "../src/lib/questionnaire";
import type { Model, DimScore, Answers } from "../src/lib/types";
import personas from "../data/personas.json";

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

describe("rank fallback (#1)", () => {
  it("uses the preset the quiz recommends when the list was never touched", () => {
    const a: Answers = { ...EMPTY_ANSWERS, business: "hospitality" };
    expect(effectiveRank(a)).toEqual(Q.presets.public_facing.order);
    const untouched = answersToProfile(a);
    const shown = answersToProfile({ ...a, rank: Q.presets.public_facing.order });
    expect(untouched.weights).toEqual(shown.weights);
    expect(untouched.tierAdj).toEqual(shown.tierAdj);
    expect(untouched.weights.tamper).toBeGreaterThan(untouched.weights.truthfulness);
  });
  it("falls back to Balanced when nothing is recommended", () => {
    expect(effectiveRank(EMPTY_ANSWERS)).toEqual(Q.presets.balanced.order);
  });
  it("keeps the user's own order when there is one", () => {
    expect(effectiveRank(rosa)).toEqual(rosa.rank);
  });
});

describe("recommend exclusivity (#2)", () => {
  it("never recommends 'staff only' next to a public answer", () => {
    const r = recommend({ ...EMPTY_ANSWERS, business: "hospitality", jobs: ["customer_messages", "marketing"] });
    expect(r.byStep.reach).toEqual(["public"]);
  });
  it("keeps the exclusive answer when it is the only one", () => {
    const r = recommend({ ...EMPTY_ANSWERS, jobs: ["marketing"] });
    expect(r.byStep.reach).toEqual(["staff_only"]);
  });
});

describe("summary (#25)", () => {
  it("reads as whole sentences for every persona", () => {
    for (const p of personas) {
      const s = summarize(p.answers as Answers);
      expect(s).not.toMatch(/\.\./);
      expect(s).not.toMatch(/\.,/);
      expect(s.endsWith(".")).toBe(true);
    }
  });
  it("keeps the reach clause when the audience question was skipped", () => {
    const s1 = summarize({ ...EMPTY_ANSWERS, jobs: ["customer_messages"], reach: ["public"] });
    expect(s1).toContain("You will use AI to reply to customer messages and reviews. The public can message it.");
    expect(s1).not.toMatch(/\.,/);
    const s2 = summarize({ ...EMPTY_ANSWERS, data: ["contacts"], reach: ["public"] });
    expect(s2).toContain("The public can message it.");
    expect(s2).toContain("You will paste in customer names.");
    const s3 = summarize({ ...EMPTY_ANSWERS, audience: "customers_direct", reach: ["public", "tools"] });
    expect(s3).toContain("Customers read what it writes with nobody checking first, and the public can message it and it can take actions on your behalf.");
  });
  it("does not double up full stops from a typed business name", () => {
    const s = summarize({ ...EMPTY_ANSWERS, business: "other", businessOther: "tattoo studio..." });
    expect(s.startsWith("You run a tattoo studio.")).toBe(true);
    expect(s).not.toMatch(/\.\./);
  });
});

describe("website override carries its own evidence", () => {
  const withCode = (id: string) => base(id, {
    next_step: "Ask for zero data retention before you paste anything.",
    dims: { ...base("x").dims, performance: { ...dim(96, "reported", "GDPval-AA v2 Elo"), value: "1853", plain: "Top of the set on real work tasks.", evidence: [{ doc_id: id, source_type: "system_card", quote: "GDPval 1853", chunk_id: "base#1", page: 167 }] } },
    overrides: { code: { ...dim(56, "reported", "Terminal-Bench 4.0"), value: "55.8%", plain: "Middle of the pack on coding tasks.", evidence: [{ doc_id: id, source_type: "system_card", quote: "Terminal-Bench 55.8%", chunk_id: "code#1", page: 171 }] } },
  });

  it("scores from overrides.code when the website task applies and says which DimScore it used", () => {
    const site = answersToProfile({ ...rosa, jobs: ["website"] });
    const { list } = rankModels(site, [withCode("m")]);
    const perf = list[0].dims.performance;
    expect(perf.s).toBe(56);
    expect(perf.metric).toBe("Terminal-Bench 4.0");
    expect(perf.source?.plain).toBe("Middle of the pack on coding tasks.");
    expect(perf.source?.evidence[0].chunk_id).toBe("code#1");
  });

  it("scores from the base check otherwise", () => {
    const { list } = rankModels(answersToProfile(rosa), [withCode("m")]);
    const perf = list[0].dims.performance;
    expect(perf.s).toBe(96);
    expect(perf.source?.plain).toBe("Top of the set on real work tasks.");
    expect(perf.source?.evidence[0].chunk_id).toBe("base#1");
  });

  it("describes the same figure the score used in the why text", async () => {
    const { explainText, explainTemplate } = await import("../src/lib/explainTemplate");
    const site = answersToProfile({ ...rosa, jobs: ["website"] });
    const ranked = rankModels(site, [withCode("m")]).list[0];
    const text = explainText(ranked, site, 1);
    expect(text).toContain("Middle of the pack on coding tasks");
    expect(text).not.toContain("Top of the set on real work tasks");
    const plain = rankModels(answersToProfile(rosa), [withCode("m")]).list[0];
    const paras = explainTemplate(plain, answersToProfile(rosa), 1);
    expect(paras.some((p) => p.pill === "Top of the set on real work tasks")).toBe(true);
  });
});

describe("why text", () => {
  it("opens with a sentence that reads naturally and leaves the next step to its own box", async () => {
    const { explainTemplate, explainText } = await import("../src/lib/explainTemplate");
    const p = answersToProfile(rosa);
    const m = base("m", { next_step: "Turn on zero data retention." });
    const r = rankModels(p, [m]).list[0];
    const paras = explainTemplate(r, p, 1);
    expect(paras[0].before.startsWith("Ranked first for a business that needs to reply to customer messages and reviews and write marketing and product copy. ")).toBe(true);
    for (const x of paras) expect(`${x.before}${x.pill}${x.after}`).not.toContain("Do this first");
    const text = explainText(r, p, 1);
    expect(text.endsWith("Do this first: Turn on zero data retention.")).toBe(true);
    expect(text.split("Do this first").length).toBe(2);
  });
  it("falls back to 'for your business' when no job is chosen", async () => {
    const { explainTemplate } = await import("../src/lib/explainTemplate");
    const p = answersToProfile({ ...rosa, jobs: [] });
    const r = rankModels(p, [base("m")]).list[0];
    expect(explainTemplate(r, p, 2)[0].before.startsWith("Ranked second for your business. ")).toBe(true);
  });
  it("joins three jobs with commas and 'and'", async () => {
    const { joinList } = await import("../src/lib/explainTemplate");
    expect(joinList(["a", "b", "c"])).toBe("a, b and c");
    expect(joinList(["a"])).toBe("a");
    expect(joinList([])).toBe("");
  });
});
