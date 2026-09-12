import Link from "next/link";
import Logo from "./Logo";

export default function SiteHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "14px 28px", background: "#FFF8EE" }}>
      <Logo />
      <nav style={{ display: "flex", gap: 18, marginLeft: 18, fontSize: 15, fontWeight: 700 }}>
        <Link href="/methodology" style={{ color: "#3F3A48", textDecoration: "none" }}>How it works</Link>
      </nav>
      <Link href="/quiz" className="spring" style={{ marginLeft: "auto", background: "#16151C", color: "#FFF8EE", border: "none", borderRadius: 999, padding: "12px 24px", fontSize: 15, fontWeight: 700, textDecoration: "none", transition: "transform .18s cubic-bezier(.34,1.56,.64,1)" }}>Find my match</Link>
    </div>
  );
}
