import Link from "next/link";
import { css } from "@/lib/proto";

export interface PersonaCard { id: string; mark: string; name: string; blurb: string; markBg: string; href: string }

export default function PersonaCards({ personas }: { personas: PersonaCard[] }) {
  return (
    <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;")}>
      {personas.map((p, i) => (
        <div key={p.id} style={css("animation:v3-rise .5s " + (0.08 * i) + "s ease-out both;display:flex;")}>
          <Link
            href={p.href}
            className="tilt"
            style={css("text-align:left;background:#FFFFFF;border:none;border-radius:24px;padding:24px;cursor:pointer;display:flex;flex-direction:column;gap:10px;box-shadow:0 14px 28px rgba(22,21,28,.07);transition:transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s ease;color:#16151C;text-decoration:none;width:100%;")}
          >
            <span aria-hidden style={css("display:flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:18px;font-size:26px;background:" + p.markBg + ";")}>{p.mark}</span>
            <span style={css("font-family:'Bricolage Grotesque',sans-serif;font-size:21px;font-weight:800;letter-spacing:-0.02em;")}>{p.name}</span>
            <span style={css("font-size:15px;line-height:1.5;color:#44404E;")}>{p.blurb}</span>
            <span style={css("font-size:15px;font-weight:800;color:#17706B;")}>See their match &rarr;</span>
          </Link>
        </div>
      ))}
    </div>
  );
}
