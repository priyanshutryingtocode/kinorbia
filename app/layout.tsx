import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // Assuming you added Auth Providers earlier

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KinOrbia",
  description: "Track the films you watch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-950 text-neutral-100 flex flex-col min-h-screen`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}