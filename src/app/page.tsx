import HeaderClient from "@/components/views/landing-page/HeaderClient";
import Hero from "@/components/views/landing-page/Hero";
import Features from "@/components/views/landing-page/Features";
import CTA from "@/components/views/landing-page/CTA";
import Footer from "@/components/views/landing-page/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      <HeaderClient />

      <main className="flex-grow relative">
        <Hero />
        <Features />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
