import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      {/* Add margin-top to prevent content from hiding behind fixed navbar */}
      <main className="relative z-0 mt-20 flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}