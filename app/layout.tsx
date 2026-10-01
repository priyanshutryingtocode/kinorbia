import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KinOrbia",
  description: "Track the films you watch.",
};

// Runs before first paint rather than in an effect. The palette is chosen by a
// `data-theme` attribute on <html>, and React cannot set that during the server
// render, so a theme applied after hydration would flash the dark canvas at a
// light-theme reader and then repaint. This has to be an inline blocking script
// for the same reason next/font keeps its class on <html>. Kept in sync with
// lib/theme.ts; `ThemeToggle` writes the same key.
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("kinorbia-theme");if(s!=="light"&&s!=="dark"){s=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=s}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `suppressHydrationWarning` because the script above mutates <html>
    // before React hydrates it, so the server and client markup differ by
    // design.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${fraunces.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
