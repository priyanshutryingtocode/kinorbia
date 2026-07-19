import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieAssistant from "@/components/MovieAssistant";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <main className="relative z-0 mt-20 flex-1">
        {children}
      </main>
      <Footer />
      <MovieAssistant />
    </>
  );
}
