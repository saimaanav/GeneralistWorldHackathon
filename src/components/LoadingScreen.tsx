"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MODELS, STATS, makerPages } from "@/lib/data";
import { css, ACCENT, maker } from "@/lib/proto";
import MakerTile from "./MakerTile";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const count = (n: number) => WORDS[n] || String(n);

export default function LoadingScreen() {
  const router = useRouter();
  const sp = useSearchParams();
  const params = sp.toString();
  const rows = useMemo(() => {
    const makers = makerPages().slice(0, 6).map((m) => ({ key: m.maker as string | null, text: maker(m.maker).name + ", " + m.pages + " pages" }));
    return [...makers, { key: null, text: "Matching against your answers" }];
  }, []);
  const [load, setLoad] = useState(0);

  useEffect(() => { router.prefetch("/results"); }, [router]);

  useEffect(() => {
    const n = rows.length;
    const every = Math.max(250, Math.min(330, Math.round(1900 / n)));
    let i = 0;
    let done: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      i += 1;
      setLoad(i);
      if (i >= n) {
        clearInterval(id);
        done = setTimeout(() => router.replace("/results" + (params ? "?" + params : "")), 200);
      }
    }, every);
    return () => { clearInterval(id); if (done) clearTimeout(done); };
  }, [rows, params, router]);

  const pages = Math.round(STATS.totalPages / 100) * 100 || STATS.totalPages;

  return (
    <div style={{ background: "#16151C", color: "#FFF8EE", minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "70px 24px" }}>
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center", animation: "v3-fade .3s ease-out both" }} aria-live="polite">
        <h2 style={{ fontSize: 38, lineHeight: 1.1 }}>Reading {count(MODELS.length)} system cards</h2>
        <p style={{ fontSize: 17, color: "#A8A2B4", margin: "10px 0 30px" }}>About {pages} pages of it. One moment.</p>
        <div style={{ height: 12, borderRadius: 999, background: "#2A2833", overflow: "hidden", marginBottom: 26 }}>
          <span style={css("display:block;height:100%;border-radius:999px;transition:width .32s linear;width:" + (load / rows.length) * 100 + "%;background:linear-gradient(90deg," + ACCENT + ",#FFC24B," + ACCENT + ");background-size:200% 100%;animation:v3-sweep 1.3s linear infinite;")} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
          {rows.map((r, i) => {
            const done = i < load;
            const active = i === load;
            return (
              <span key={r.text} style={css(
                "display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 16px;border-radius:14px;font-size:15px;transition:background .3s ease,color .3s ease;background:" +
                (done ? "#232130" : "transparent") + ";color:" + (done ? "#FFF8EE" : "#9A93AC") + ";font-weight:" + (done ? 700 : 400) + ";" + (active ? "animation:v3-blink 1s ease-in-out infinite;" : "")
              )}>
                {r.key ? <MakerTile makerKey={r.key} size={26} /> : <span style={{ width: 26, flex: "0 0 26px" }} />}
                <span style={{ flex: "1 1 auto", textAlign: "left" }}>{r.text}</span>
                <span style={{ color: "#FFC24B", fontWeight: 800, minWidth: 16 }}>{done ? "✓" : ""}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
