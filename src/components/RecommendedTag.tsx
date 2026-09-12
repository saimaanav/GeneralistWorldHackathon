"use client";
import { optionLabel } from "@/lib/questionnaire";

/** "Recommended for a bakery" style label; plain "Recommended" when there is no business yet. */
export function recommendedLabel(business?: string): string {
  if (!business || business === "other") return "Recommended";
  return "Recommended for a " + optionLabel("business", business).toLowerCase();
}

export default function RecommendedTag({ business }: { business?: string }) {
  return (
    <span style={{ display: "inline-block", maxWidth: "100%", background: "#FFC24B", color: "#40300A", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 800, lineHeight: 1.4 }}>
      {recommendedLabel(business)}
    </span>
  );
}

export function BestMatchTag() {
  return (
    <span style={{ display: "inline-block", background: "#E6F2F0", color: "#0F4F4B", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 800, lineHeight: 1.4, whiteSpace: "nowrap" }}>
      Best match
    </span>
  );
}
