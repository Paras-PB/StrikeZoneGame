import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";

// V8 HOLOGRAM UI — display font for titles/big numbers, UI font for text.
const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-display",
});
const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: "STRIKEZONE — Tactical FPS",
  description: "Fast COD-style browser FPS built with Next.js + Three.js",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${rajdhani.variable}`}>
      <body>{children}</body>
    </html>
  );
}
