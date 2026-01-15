import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; 
import Navbar from "@/components/Navbar"; // <-- Import it

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
      <body className={`${inter.className} bg-neutral-950 text-neutral-100`}>
        <Navbar /> {/* <-- Add it here */}
        <div className="pt-20"> {/* <-- Add padding so content isn't hidden behind the fixed navbar */}
          {children}
        </div>
      </body>
    </html>
  );
}