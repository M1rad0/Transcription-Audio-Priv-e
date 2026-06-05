import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transcription Audio Privée",
  description: "Espace local de transcription audio privée.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body
        className="flex h-full flex-col overflow-hidden text-slate-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
