import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "CardCompass",
  description: "Which AI is safe for your business? Ranked from the labs' own safety paperwork, explained in plain English.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div style={{ minHeight: "100vh", background: "#FFF8EE", overflowX: "hidden", display: "flex", flexDirection: "column" }}>
          <SiteHeader />
          <div style={{ flex: "1 0 auto" }}>{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
