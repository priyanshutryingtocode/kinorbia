import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MovieAssistant from "@/components/MovieAssistant";
import BackToTop from "@/components/BackToTop";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <a
        href="#main"
        className="kin-focus sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-control focus:bg-content focus:px-4 focus:py-2 focus:text-canvas focus:outline-none"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" tabIndex={-1} className="shell-main focus:outline-none">
        {children}
      </main>
      <Footer />
      <MovieAssistant />
      <BackToTop />
    </>
  );
}
