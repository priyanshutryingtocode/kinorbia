import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; 
import Navbar from "@/components/Navbar"; 
import Footer from "@/components/Footer";

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
        <Navbar /> 
        <div className="pt-20"> 
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}