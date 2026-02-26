import "./globals.css";

import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";

import AuthGate from "@/components/auth/AuthGate";
import { AuthProvider } from "@/components/auth/AuthProvider";
import AIAssistantWidget from "@/components/layout/AIAssistantWidget";
import NavBar from "@/components/layout/NavBar";

const heading = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap"
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"]
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "AI Training Portal",
  description: "Internal learning path to master AI quickly and confidently."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body text-ink">
        <AuthProvider>
          <div className="min-h-screen">
            <header className="relative overflow-hidden border-b border-white/70 bg-white/60">
              <div className="pointer-events-none absolute -right-28 -top-24 h-56 w-56 rounded-full bg-teal-200/50 blur-3xl animate-drift" />
              <div className="pointer-events-none absolute left-16 top-10 h-24 w-24 rounded-full bg-amber-200/50 blur-2xl" />
              <NavBar />
            </header>
            <AuthGate>
              <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-10">
                {children}
              </main>
            </AuthGate>
            <footer className="border-t border-white/80 bg-white/40">
              <div className="mx-auto flex w-full max-w-6xl px-6 py-6 text-sm text-slate-600">
                <span>Internal AI training portal.</span>
              </div>
            </footer>
            <AIAssistantWidget />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
