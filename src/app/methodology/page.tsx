import type { Metadata } from "next";
import StackedCoverage from "@/components/StackedCoverage";
import StatusLegend from "@/components/StatusLegend";
import SourcesList from "@/components/SourcesList";
import { MODELS, SOURCES, STATS, stacks } from "@/lib/data";
import { css } from "@/lib/proto";
import scoresJson from "../../../data/scores.resolved.json";

export const metadata: Metadata = {
  title: "How it works | CardCompass",
  description: "How CardCompass scores AI models from the labs' own system cards, and where every number comes from.",
};

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
function word(n: number): string {
  return n >= 0 && n < WORDS.length ? WORDS[n] : String(n);
}

interface Skipped { name: string; reason: string }

export default function MethodologyPage() {
  const n = MODELS.length;
  const indexed = MODELS.filter((mm) => (STATS.docs[mm.card.doc_id]?.pages || 0) > 0).length;
  const steps = [
    { n: "1", title: "You tell us how you will use it", text: "Eight questions about your business, your data, and who can reach the AI. Each answer changes how much weight we give to the five things we compare." },
    { n: "2", title: "We read what the makers publish", text: `Every AI company publishes a long document about its model. We have indexed ${indexed} of the ${n} cards sentence by sentence so far; the other ${n - indexed} use figures we checked in the maker's published document, linked from every card.` },
    { n: "3", title: "We score what is there, and what is not", text: "A published test result counts fully. A vague description counts for half. Silence is scored low and lowers our confidence in the total, so quiet makers cannot hide behind a good headline." },
    { n: "4", title: "You see the quote", text: "For indexed cards, every claim links to the sentence it came from, with the page number and a link to the original. For the rest, it links to the document itself until we index it." },
  ];
  const stackRows = stacks().map((s) => ({ id: s.model.id, name: s.model.display_name, makerKey: s.model.maker, published: s.published, described: s.described, silent: s.silent }));
  const sources = SOURCES.map((d) => ({
    doc_id: d.doc_id,
    title: d.title,
    makerKey: d.maker,
    type: d.type,
    url: d.url,
    published: d.published,
    pages: STATS.docs[d.doc_id]?.pages,
    fetched: STATS.generated,
  }));
  const rawSkipped = (scoresJson as unknown as { skipped?: unknown }).skipped;
  const skipped: Skipped[] = Array.isArray(rawSkipped)
    ? rawSkipped.filter((s): s is Skipped => !!s && typeof s === "object" && typeof (s as Skipped).name === "string")
    : [];

  return (
    <main>
      <div style={css("background:#16151C;color:#FFF8EE;padding:60px 28px;")}>
        <div style={css("max-width:860px;margin:0 auto;animation:v3-rise .5s ease-out both;")}>
          <h2 className="h2-44" style={css("font-size:48px;line-height:1.05;")}>How we work it out</h2>
          <p style={css("font-size:19px;line-height:1.6;color:#BEB8C9;max-width:58ch;margin:14px 0 0;")}>
            In one line: we reward makers who publish real numbers about their model, and mark down the ones who stay quiet. Two models with the same score are not equally proven, which is what the evidence column is for.
          </p>
        </div>
      </div>

      <div style={css("background:#FFF8EE;padding:60px 28px 80px;")}>
        <div style={css("max-width:860px;margin:0 auto;")}>
          <div style={css("display:flex;flex-direction:column;gap:12px;")}>
            {steps.map((s, i) => (
              <div key={s.n} style={css("animation:v3-rise .5s " + (0.07 * i) + "s ease-out both;")}>
                <div className="step" style={css("background:#FFFFFF;border-radius:20px;padding:22px 26px;display:flex;gap:18px;align-items:flex-start;box-shadow:0 12px 26px rgba(22,21,28,.05);transition:transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s ease;")}>
                  <span style={css("flex:0 0 38px;height:38px;border-radius:50%;background:#E6F2F0;color:#0F4F4B;font-weight:800;font-size:17px;display:flex;align-items:center;justify-content:center;")}>{s.n}</span>
                  <span style={css("display:flex;flex-direction:column;gap:5px;")}>
                    <span style={css("font-family:'Bricolage Grotesque',sans-serif;font-size:19px;font-weight:800;letter-spacing:-0.02em;")}>{s.title}</span>
                    <span style={css("font-size:15px;line-height:1.6;color:#3F3A48;")}>{s.text}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <h3 style={css("font-size:28px;margin:44px 0 14px;")}>The formula</h3>
          <div style={css("animation:v3-rise .5s .28s ease-out both;")}>
            <div className="step" style={css("background:#FFFFFF;border-radius:20px;padding:22px 26px;box-shadow:0 12px 26px rgba(22,21,28,.05);border-left:5px solid #17706B;transition:transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s ease;")}>
              <p style={css("font-size:16px;line-height:1.65;color:#3F3A48;margin:0;text-wrap:pretty;")}>
                Each check is scored 0 to 100. Your answers set a weight for each check. A published number counts in full, a description counts for half, an older-version result counts at 80%, and silence is scored 35 and counts as no evidence. Your match score is the weighted average, scaled by how much evidence there is (from 75% to 100%). If you ranked cost in your top two, cheaper models get +5 and flagship models -5 on the final score; if cost is in your bottom two, flagship models get +3; otherwise there is no adjustment.
              </p>
            </div>
          </div>

          <h3 style={css("font-size:28px;margin:44px 0 6px;")}>What all {word(n)} publish, side by side</h3>
          <p style={css("font-size:16px;color:#44404E;margin:0 0 18px;")}>Each bar is one model. Green is a published test result, amber is a description with no number, red is silence.</p>
          <StackedCoverage rows={stackRows} />

          <h3 style={css("font-size:28px;margin:44px 0 14px;")}>What the bars mean</h3>
          <StatusLegend />

          <h3 style={css("font-size:28px;margin:44px 0 14px;")}>Where it all comes from</h3>
          <SourcesList sources={sources} />

          {skipped.length > 0 && (
            <>
              <h3 style={css("font-size:28px;margin:44px 0 6px;")}>Not included, and why</h3>
              <p style={css("font-size:16px;color:#44404E;margin:0 0 14px;")}>Models we looked at but left out of the ranking.</p>
              <div style={css("background:#FFFFFF;border-radius:22px;padding:8px 26px;box-shadow:0 12px 26px rgba(22,21,28,.05);")}>
                {skipped.map((s) => (
                  <div key={s.name} style={css("padding:14px 0;border-bottom:1px solid #F5F0E7;display:flex;gap:14px;align-items:baseline;flex-wrap:wrap;")}>
                    <span style={css("flex:0 0 200px;font-size:16px;font-weight:700;")}>{s.name}</span>
                    <span style={css("flex:1 1 260px;font-size:15px;line-height:1.55;color:#3F3A48;")}>{s.reason}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <p style={css("font-size:14px;line-height:1.6;color:#565064;margin:26px 0 0;")}>
            Not legal or compliance advice. Check the vendor&apos;s data processing terms before uploading customer, payment or health information.
          </p>
        </div>
      </div>
    </main>
  );
}
