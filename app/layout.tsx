import type { Metadata, Viewport } from "next";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource-variable/libre-franklin/index.css";
import "@fontsource/unifrakturmaguntia/index.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Brief.",
  description: "One newspaper, made for one reader, every morning.",
};

export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
