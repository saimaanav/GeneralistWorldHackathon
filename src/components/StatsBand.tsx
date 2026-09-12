import { css } from "@/lib/proto";

export default function StatsBand({ totalPages }: { totalPages: number }) {
  const stats = [
    { figure: "58%", text: "of small businesses already use AI in some form." },
    { figure: "36%", text: "of the businesses that have not adopted AI say privacy and security is what stops them." },
    { figure: String(totalPages), text: "pages of small print we read so you do not have to." },
  ];
  return (
    <div style={css("background:#17706B;color:#FFFFFF;padding:66px 28px;")}>
      <div style={css("max-width:1120px;margin:0 auto;")}>
        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:28px;")}>
          {stats.map((st, i) => (
            <div key={st.figure} style={css("animation:v3-rise .5s " + (0.07 * i) + "s ease-out both;")}>
              <div className="stat" style={css("background:#0F5A56;border-radius:24px;padding:26px 24px;height:100%;transition:transform .25s cubic-bezier(.34,1.56,.64,1), background .25s ease;")}>
                <div style={css("font-family:'Bricolage Grotesque',sans-serif;font-size:62px;font-weight:800;letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums;color:#FFC24B;")}>{st.figure}</div>
                <div style={css("font-size:17px;line-height:1.5;color:#E4F2F1;margin-top:8px;max-width:30ch;text-wrap:pretty;")}>{st.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
