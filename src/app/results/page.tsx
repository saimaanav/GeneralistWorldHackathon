import { Suspense } from "react";
import type { Metadata } from "next";
import Results from "@/components/Results";

export const metadata: Metadata = { title: "Your matches, CardCompass", description: "Every AI model in our set, ranked for your business, with the quote behind every score." };

export default function ResultsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh", background: "#FFF8EE" }} />}>
      <Results />
    </Suspense>
  );
}
