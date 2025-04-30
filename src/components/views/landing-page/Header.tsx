"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Brain } from "lucide-react";
import { AuthHeader } from "./auth-header";
import { ShineBorder } from "@/components/magicui/shine-border";
import { SparklesText } from "@/components/magicui/sparkles-text";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <ShineBorder className="rounded-full p-1.5">
              <Brain className="h-8 w-8 text-primary" />
            </ShineBorder>
            <Link href="/" className="text-2xl font-bold">
              <SparklesText text="POSITIVE-Next" />
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            {[
              { href: "/#features", label: "Features" },
              { href: "/#about", label: "About" },
              { href: "/#testimonials", label: "Testimonials" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-foreground hover:text-primary transition-colors relative group py-2"
              >
                {item.label}
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary transform scale-x-0 origin-left transition-transform group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
          
          <div className="hidden md:flex">
            <AuthHeader />
          </div>
          
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-foreground hover:text-primary transition-colors p-2"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {isMenuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-md animate-in slide-in-from-top duration-300">
          <nav className="px-4 pt-2 pb-6 space-y-4">
            {[
              { href: "/#features", label: "Features" },
              { href: "/#about", label: "About" },
              { href: "/#testimonials", label: "Testimonials" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block py-2 text-foreground hover:text-primary transition-colors border-b border-border/20"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2">
              <AuthHeader />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
