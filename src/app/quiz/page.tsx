import { Suspense } from "react";
import type { Metadata } from "next";
import Quiz from "@/components/Quiz";

export const metadata: Metadata = { title: "Eight questions, CardCompass", description: "Tell us about your business and we will rank the AI models for it." };

export default function QuizPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh", background: "#FFF8EE" }} />}>
      <Quiz />
    </Suspense>
  );
}
