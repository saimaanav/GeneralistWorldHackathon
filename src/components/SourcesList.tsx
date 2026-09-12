import MakerTile from "./MakerTile";
import { css } from "@/lib/proto";

export interface SourceRow { doc_id: string; title: string; makerKey: string; type: string; url: string; published: string; pages?: number; fetched: string }

const TYPE_WORDS: Record<string, string> = {
  system_card: "System card",
  model_card: "Model card",
  technical_report: "Technical report",
  policy_page: "Policy page",
  third_party: "Third-party report",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-01" -> "1 Sep 2026", "2026-09" -> "Sep 2026", "2026" -> "2026". Anything else passes through. */
export function fmtDate(s: string): string {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(s || "");
  if (!m) return s;
  const [, y, mo, d] = m;
  const month = mo ? MONTHS[Math.max(0, Math.min(11, parseInt(mo, 10) - 1))] : "";
  if (d && month) return parseInt(d, 10) + " " + month + " " + y;
  if (month) return month + " " + y;
  return y;
}

function typeWords(t: string): string {
  return TYPE_WORDS[t] || t.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default function SourcesList({ sources }: { sources: SourceRow[] }) {
  return (
    <div style={css("display:flex;flex-direction:column;gap:10px;")}>
      {sources.map((s) => {
        const meta = [typeWords(s.type), s.pages ? s.pages + (s.pages === 1 ? " page" : " pages") : "", "published " + fmtDate(s.published), "fetched " + fmtDate(s.fetched)]
          .filter(Boolean)
          .join(" · ");
        return (
          <div
            key={s.doc_id}
            className="tint-white"
            style={css("display:flex;gap:12px;flex-wrap:wrap;align-items:baseline;border-bottom:1px solid #EFE7DA;padding:8px 12px 10px;margin:0 -12px;border-radius:12px;transition:background .2s ease;")}
          >
            <MakerTile makerKey={s.makerKey} size={28} />
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              style={css("display:inline-block;font-size:16px;font-weight:700;padding:12px 0;margin:-12px 0;")}
            >
              {s.title}
            </a>
            <span style={css("font-size:13px;color:#565064;")}>{meta}</span>
          </div>
        );
      })}
    </div>
  );
}
