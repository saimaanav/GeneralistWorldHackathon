import type { Status } from "./proto";
export type { Status };

export type DimKey = "performance" | "truthfulness" | "privacy" | "fairness" | "tamper";
export const DIMS: DimKey[] = ["performance", "truthfulness", "privacy", "fairness", "tamper"];

export type SourceType = "system_card" | "model_card" | "technical_report" | "policy_page" | "third_party";

export interface Evidence {
  doc_id: string;
  source_type: SourceType;
  quote: string;
  chunk_id?: string;
  page?: number | null;
  section?: string;
  url?: string;
}

export interface DimScore {
  score: number | null;
  status: Status;
  metric?: string;
  value?: string;
  plain?: string;
  evidence: Evidence[];
  curator_note?: string;
  covers?: string[];
  stale?: boolean;
}

export interface Policy {
  trains_on_inputs_by_default: "true" | "false" | "unknown";
  surface: string;
  zdr: "available" | "on_request" | "not_available" | "unknown" | "self_host";
  retention: string;
  baa: boolean | null;
  evidence: Evidence[];
}

export interface Model {
  id: string;
  display_name: string;
  maker: string;
  tier: "flagship" | "mid" | "efficient";
  deployment: "api" | "open_weights" | "both";
  api_id: string;
  price: { input: number | null; output: number | null; note: string; band: "low" | "mid" | "high" };
  context: string;
  data_location: string;
  card: { doc_id: string; url: string; type: string; published: string; retrieved: string; pages?: number; title?: string };
  status: "draft" | "reviewed";
  one_liner: string;
  next_step: string;
  how_to_use?: string;
  policy: Policy;
  dims: Record<DimKey, DimScore>;
  overrides?: Record<string, DimScore>;
  badges?: { text: string; kind: "warn" | "info" | "pending" }[];
}

export interface ScoresFile { version: string; models: Model[] }

export interface Answers {
  business?: string;
  jobs: string[];
  rank: string[];
  audience?: string;
  data: string[];
  reach: string[];
  decisions?: string;
  text?: string;
  docText?: string;
  docName?: string;
}

export interface DeltaNote { dim: DimKey; delta: number; source: string }

export interface ProfileFlags {
  regulated: boolean;
  strict: boolean;
  customerFacing: boolean;
  publicInput: boolean;
  injectionExposure: boolean;
  decisions: boolean;
  health: boolean;
}

export interface Profile {
  weights: Record<DimKey, number>;
  tierAdj: { efficient: number; flagship: number };
  flags: ProfileFlags;
  tasks: string[];
  notes: DeltaNote[];
  summary: string;
  business?: string;
}

export interface Interpretation {
  summary: string;
  weight_deltas: Partial<Record<DimKey, number>>;
  add_tasks: string[];
  add_flags: string[];
  reasons: string[];
  source: "claude" | "rules";
}

export interface DimResult { s: number; c: number; status: Status; score: number | null; label: string; value?: string; metric?: string }

export interface Ranked {
  model: Model;
  final: number;
  composite: number;
  trust: number;
  coverage: number;
  partition: "main" | "demoted" | "excluded";
  reasons: string[];
  dims: Record<DimKey, DimResult>;
  pending: boolean;
}

export interface RankResult { list: Ranked[]; neverEmpty: boolean }
