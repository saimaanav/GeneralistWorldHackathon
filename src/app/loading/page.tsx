import { Suspense } from "react";
import type { Metadata } from "next";
import LoadingScreen from "@/components/LoadingScreen";

export const metadata: Metadata = { title: "Reading the cards, CardCompass" };

export default function LoadingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "70vh", background: "#16151C" }} />}>
      <LoadingScreen />
    </Suspense>
  );
}
