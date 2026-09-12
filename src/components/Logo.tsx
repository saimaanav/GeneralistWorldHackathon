import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="grow-4" style={{ display: "flex", alignItems: "center", gap: 11, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "#16151C", textDecoration: "none", transition: "transform .3s cubic-bezier(.34,1.56,.64,1)" }}>
      <span style={{ position: "relative", width: 34, height: 34, borderRadius: "50%", background: "#16151C", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ position: "absolute", inset: 4, borderRadius: "50%", border: "2px solid #2F6D69" }} />
        <span style={{ width: 13, height: 13, background: "#17706B", borderTopRightRadius: 12, borderBottomLeftRadius: 12, animation: "v3-needle 6s ease-in-out infinite", transformOrigin: "50% 50%" }} />
        <span style={{ position: "absolute", top: 3, left: "50%", width: 3, height: 3, marginLeft: -1.5, borderRadius: "50%", background: "#FFC24B" }} />
      </span>
      <span>Card<span style={{ color: "#17706B" }}>Compass</span></span>
    </Link>
  );
}
