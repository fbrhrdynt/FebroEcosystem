import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoltLab by Febro Herdyanto",
  description: "Belajar listrik AC dan DC melalui simulasi wiring, kalkulator dan latihan interaktif.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
