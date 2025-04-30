import Header from "@/components/views/landing-page/Header";
import Hero from "@/components/views/landing-page/Hero";
import SocialProof from "@/components/views/landing-page/SocialProof";
import Features from "@/components/views/landing-page/Features";
import About from "@/components/views/landing-page/About";
import Testimonials from "@/components/views/landing-page/Testimonials";
import CTA from "@/components/views/landing-page/CTA";
import Footer from "@/components/views/landing-page/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background via-background to-secondary/20 overflow-hidden">
      <Header />

      <main className="flex-grow relative">
        {/* Subtle background pattern and gradient */}
        <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-transparent -z-10" />

        <Hero />
        <SocialProof />
        <Features />
        <About />
        <Testimonials />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
