import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STRIKEZONE — Tactical FPS",
  description: "Fast COD-style browser FPS built with Next.js + Three.js",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
