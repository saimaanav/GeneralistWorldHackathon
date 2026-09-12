import Link from "next/link";
import { DATA_VERSION } from "@/lib/data";

export default function SiteFooter() {
  return (
    <footer style={{ background: "#16151C", color: "#FFF8EE", padding: "44px 28px 52px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#9A93AC" }}>Data as of {DATA_VERSION}</span>
          <Link href="/methodology" style={{ display: "inline-block", color: "#FFF8EE", fontSize: 15, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3, padding: "12px 0" }}>
            Read the methodology
          </Link>
        </div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "#BEB8C9", maxWidth: "70ch" }}>
          Built for UN SDG 8, targets 8.2 and 8.3: safer AI adoption for the businesses that create most jobs.
        </p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#BEB8C9", maxWidth: "76ch" }}>
          This is not legal or compliance advice. Check the vendor&apos;s data processing terms before you upload customer, payment or health information.
        </p>
      </div>
    </footer>
  );
}
