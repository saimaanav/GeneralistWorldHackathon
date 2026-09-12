"use client";
import { css } from "@/lib/proto";

export default function DoThisFirst({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="dothis" style={css("background:#E6F2F0;border-radius:16px;padding:15px 17px;font-size:15px;line-height:1.55;color:#0F4F4B;border-left:5px solid #17706B;transition:transform .22s cubic-bezier(.34,1.56,.64,1), background .22s ease;")}>
      <strong style={{ fontWeight: 800 }}>Do this first:</strong> {text}
    </div>
  );
}
