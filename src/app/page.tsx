import HeroRace from "@/components/HeroRace";
import PillarCards from "@/components/PillarCard";
import StatsBand from "@/components/StatsBand";
import PersonaCards from "@/components/PersonaCards";
import { MODELS, PERSONAS, STATS, race, pillarBars, footnoteFor } from "@/lib/data";
import { DIM_META, Q, answersToParams } from "@/lib/questionnaire";
import { css } from "@/lib/proto";
import type { DimKey } from "@/lib/types";

const PILLAR_ORDER: DimKey[] = ["truthfulness", "privacy", "tamper", "fairness", "performance"];

export default function Home() {
  const rows = race().map((r) => ({ id: r.model.id, name: r.model.display_name, makerKey: r.model.maker, pct: r.pct, note: r.note }));
  const pillars = PILLAR_ORDER.map((dim) => ({
    dim,
    label: DIM_META[dim].label,
    icon: DIM_META[dim].icon,
    plain: DIM_META[dim].plain,
    footnote: footnoteFor(dim),
    bars: pillarBars(dim).map((b) => ({ id: b.model.id, value: b.value, status: b.status })),
  }));
  const personas = PERSONAS.map((p) => ({
    id: p.id,
    mark: p.mark,
    name: p.name,
    blurb: p.blurb,
    markBg: p.markBg,
    href: "/results?" + answersToParams(p.answers).toString() + "&persona=" + encodeURIComponent(p.id),
  }));

  return (
    <main>
      <HeroRace rows={rows} totalPages={STATS.totalPages} questions={Q.steps.length} />

      <section style={css("background:#FFF8EE;padding:72px 28px;")}>
        <div style={css("max-width:1120px;margin:0 auto;")}>
          <h2 className="h2-44" style={css("font-size:44px;line-height:1.05;max-width:18ch;margin-bottom:12px;")}>Five things worth knowing before you trust one.</h2>
          <p style={css("font-size:18px;color:#44404E;max-width:52ch;margin:0 0 34px;")}>Hover any of them to see how the {MODELS.length} models compare right now.</p>
          <PillarCards pillars={pillars} />
        </div>
      </section>

      <StatsBand totalPages={STATS.totalPages} />

      <section style={css("background:#FFF8EE;padding:72px 28px 86px;")}>
        <div style={css("max-width:1120px;margin:0 auto;")}>
          <h2 className="h2-44" style={css("font-size:40px;margin-bottom:8px;")}>Start from a business like yours</h2>
          <p style={css("font-size:18px;color:#44404E;margin:0 0 26px;")}>Three examples, already filled in. Change anything afterwards.</p>
          <PersonaCards personas={personas} />
          <p style={css("font-size:14px;line-height:1.6;color:#565064;max-width:76ch;margin:40px 0 0;")}>
            We compare how much each company tells you and how solid those numbers are, rather than one lab&apos;s benchmark against another&apos;s. This is not legal advice: check the vendor&apos;s terms before you upload customer, payment or health information.
          </p>
        </div>
      </section>
    </main>
  );
}
