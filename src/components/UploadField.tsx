"use client";
import { useRef, useState } from "react";
import { css } from "@/lib/proto";

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_CHARS = 20000;

export default function UploadField({ docName, onFile, onRemove }: {
  docName?: string;
  onFile: (text: string, name: string) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  async function handle(file: File | undefined | null) {
    if (!file) return;
    setError("");
    if (file.size > MAX_BYTES) { setError("That file is over 4 MB. Try a smaller one, or paste the important part above."); return; }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    setBusy(true);
    try {
      let text = "";
      if (ext === "md" || ext === "txt" || file.type.startsWith("text/")) {
        text = await file.text();
      } else if (ext === "pdf" || file.type === "application/pdf") {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/extract", { method: "POST", body: fd });
        if (!res.ok) throw new Error("extract " + res.status);
        const j = (await res.json()) as { text?: string };
        text = String(j.text || "");
      } else {
        setError("We can read text files, Markdown and PDFs for now. Save it as one of those and try again.");
        return;
      }
      text = text.replace(/\r\n/g, "\n").trim().slice(0, MAX_CHARS);
      if (!text) { setError("We could not find any text in that file."); return; }
      onFile(text, file.name);
    } catch {
      setError("We could not read that file. Try a text file or paste the important part above.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  if (docName) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={css("display:inline-flex;align-items:center;gap:6px;background:#E6F2F0;color:#0F4F4B;border-radius:999px;padding:6px 6px 6px 16px;font-size:15px;font-weight:700;max-width:100%;")}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60vw" }}>{docName}</span>
          <button type="button" onClick={onRemove} aria-label={"Remove " + docName} style={css("width:44px;height:44px;margin:-6px -6px -6px 0;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;")}>
            <span className="close" style={css("width:30px;height:30px;border-radius:50%;background:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:18px;color:#3F3A48;transition:background .18s ease;")}>×</span>
          </button>
        </span>
        <span style={{ fontSize: 14, color: "#565064" }}>We read it. It stays on this device and is thrown away when you close the tab.</span>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a document: Word doc, text file or PDF up to 4 MB"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); if (!over) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files?.[0]); }}
        className="dropzone"
        style={css("border:2px dashed " + (over ? "#17706B" : "#DCD3C4") + ";border-radius:16px;background:" + (over ? "#F0F7F6" : "#FDF9F2") + ";padding:22px;text-align:center;cursor:pointer;transition:border-color .2s ease,background .2s ease;")}
      >
        <div style={{ fontSize: 16, color: "#3F3A48" }}>
          {busy ? <span style={{ animation: "v3-blink 1.2s ease-in-out infinite", fontWeight: 700 }}>Reading it…</span> : <>Got something written down? Drop it here, <span style={{ color: "#17706B", fontWeight: 700, textDecoration: "underline" }}>or browse</span></>}
        </div>
        <div style={{ fontSize: 13, color: "#565064", marginTop: 6 }}>Word doc, text file or PDF, up to 4 MB. We read it, use it, then throw it away.</div>
        <input ref={input} type="file" accept=".md,.txt,.pdf,text/plain,text/markdown,application/pdf" style={{ display: "none" }} onChange={(e) => handle(e.target.files?.[0])} />
      </div>
      {error && <div role="alert" style={{ fontSize: 14, color: "#8E3524", marginTop: 8 }}>{error}</div>}
    </div>
  );
}
