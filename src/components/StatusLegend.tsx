import { ACCENT, STATUS_CHIP, STATUS_LEGEND, STATUS_WORD, css, fill } from "@/lib/proto";

export default function StatusLegend() {
  return (
    <div style={css("background:#FFFFFF;border-radius:22px;padding:8px 26px;box-shadow:0 12px 26px rgba(22,21,28,.05);")}>
      {STATUS_LEGEND.map((s) => (
        <div key={s.status} style={css("padding:15px 0;border-bottom:1px solid #F5F0E7;display:flex;gap:16px;align-items:center;flex-wrap:wrap;")}>
          <span aria-hidden style={css("flex:0 0 74px;height:11px;border-radius:999px;background:#EFE7DA;overflow:hidden;")}>
            <span style={css(fill(s.sample, s.status, ACCENT, true))} />
          </span>
          <span style={css("flex:0 0 160px;")}>
            <span style={css(STATUS_CHIP[s.status])}>{STATUS_WORD[s.status]}</span>
          </span>
          <span style={css("flex:1 1 260px;font-size:15px;line-height:1.55;color:#3F3A48;")}>{s.text}</span>
        </div>
      ))}
    </div>
  );
}
