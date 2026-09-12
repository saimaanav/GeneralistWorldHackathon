"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MakerTile from "./MakerTile";
import { ACCENT, css } from "@/lib/proto";

export interface RaceRow { id: string; name: string; makerKey: string; pct: number; note: string }

const VISIBLE = 8;
const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

export default function HeroRace({ rows, totalPages, questions }: { rows: RaceRow[]; totalPages: number; questions: number }) {
  const [on, setOn] = useState(false);
  const [spot, setSpot] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const hovering = useRef(false);

  const visible = showAll ? rows : rows.slice(0, VISIBLE);
  const count = visible.length;
  const hidden = rows.length - VISIBLE;

  useEffect(() => {
    const t = setTimeout(() => setOn(true), 120);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (count <= 1) return;
    const i = setInterval(() => {
      if (!hovering.current) setSpot((s) => (s + 1) % count);
    }, 2200);
    return () => clearInterval(i);
  }, [count]);

  const active = count ? visible[Math.min(spot, count - 1)] : undefined;
  const qWord = questions >= 0 && questions < WORDS.length ? WORDS[questions] : String(questions);

  return (
    <div style={css("background:#16151C;color:#FFF8EE;padding:66px 28px 80px;position:relative;")}>
      <span aria-hidden style={css("position:absolute;top:40px;right:8%;width:90px;height:90px;border-radius:30px;background:#FFC24B;opacity:.9;animation:v3-float 7s ease-in-out infinite;")} />
      <span aria-hidden style={css("position:absolute;bottom:60px;left:4%;width:56px;height:56px;border-radius:50%;background:#17706B;animation:v3-float 9s ease-in-out infinite reverse;")} />
      <div style={css("max-width:1120px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:48px;align-items:center;position:relative;")}>
        <div style={css("animation:v3-rise .55s ease-out both;")}>
          <span style={css("display:inline-block;background:#FFC24B;color:#40300A;border-radius:999px;padding:7px 16px;font-size:14px;font-weight:800;transform:rotate(-2deg);")}>Built for small businesses</span>
          <h1 className="hero-h1" style={css("font-size:66px;line-height:.98;margin:20px 0 18px;max-width:14ch;text-wrap:balance;")}>Pick the AI that won&apos;t let you down.</h1>
          <p style={css("font-size:20px;line-height:1.55;color:#C9C3D4;max-width:46ch;margin:0 0 30px;text-wrap:pretty;")}>
            {qWord} plain questions about your business. We read the {totalPages} pages of small print the AI companies publish, then show you which model fits, and what each one quietly leaves out.
          </p>
          <div style={css("display:flex;gap:12px;flex-wrap:wrap;align-items:center;")}>
            <Link
              href="/quiz"
              className="press"
              style={css("display:inline-block;background:#17706B;color:#FFFFFF;border:none;border-radius:999px;padding:19px 36px;font-size:18px;font-weight:800;cursor:pointer;box-shadow:0 7px 0 #0B3D3A;text-decoration:none;")}
            >
              Start, it takes 2 minutes
            </Link>
            <span style={css("font-size:15px;color:#AFA9BD;")}>No sign-up. Nothing you type is kept.</span>
          </div>
        </div>

        <div style={css("background:#FFF8EE;color:#16151C;border-radius:28px;padding:26px 26px 22px;box-shadow:0 24px 50px rgba(0,0,0,.3);animation:v3-rise .55s .14s ease-out both;")}>
          <div style={css("display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:4px;")}>
            <h3 style={css("font-size:21px;")}>How much do they tell you?</h3>
          </div>
          <p style={css("font-size:14px;color:#565064;margin:0 0 18px;")}>Share of the five checks each maker actually publishes.</p>
          <div onMouseLeave={() => { hovering.current = false; }}>
            {visible.map((r, i) => (
              <div
                key={r.id}
                className="nudge"
                onMouseEnter={() => { hovering.current = true; setSpot(i); }}
                style={css("display:flex;align-items:center;gap:10px;padding:5px 0;cursor:default;transition:opacity .35s ease,transform .25s ease;opacity:" + (i === spot ? 1 : 0.62) + ";")}
              >
                <MakerTile makerKey={r.makerKey} size={24} />
                <span style={css("flex:0 0 112px;font-size:13px;font-weight:600;")}>{r.name}</span>
                <span style={css("flex:1 1 auto;height:16px;border-radius:999px;background:#EFE7DA;overflow:hidden;")}>
                  <span style={css("display:block;height:100%;border-radius:999px;transition:width 1s cubic-bezier(.34,1.1,.64,1) " + (i * 0.07) + "s, background .35s ease;width:" + (on ? r.pct : 0) + "%;background:" + (i === spot ? "#FFC24B" : ACCENT) + ";")} />
                </span>
                <span style={css("flex:0 0 38px;text-align:right;font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;")}>{r.pct}%</span>
              </div>
            ))}
          </div>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => { setShowAll((v) => !v); setSpot(0); }}
              style={css("display:inline-flex;align-items:center;min-height:44px;margin-top:4px;padding:0 4px;background:none;border:none;font-size:14px;font-weight:700;color:#17706B;text-decoration:underline;text-underline-offset:3px;cursor:pointer;")}
            >
              {showAll ? "Show fewer" : "and " + hidden + " more"}
            </button>
          )}
          <div style={css("margin-top:14px;background:#F3EEE4;border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.45;color:#3F3A48;min-height:62px;")}>{active?.note}</div>
        </div>
      </div>
    </div>
  );
}
