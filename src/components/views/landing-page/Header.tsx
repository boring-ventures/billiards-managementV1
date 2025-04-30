"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Brain } from "lucide-react";
import { AuthHeader } from "./auth-header";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Add scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-white/90 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-5"
    }`}>
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className={`transition-all duration-300 rounded-lg ${
              scrolled ? "bg-gradient-to-br from-primary to-blue-600" : "bg-white/20 backdrop-blur-md group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-blue-600"
            } p-1.5 shadow-sm`}>
              <Brain className={`h-6 w-6 ${scrolled ? "text-white" : "text-primary group-hover:text-white"}`} />
            </div>
            <span className={`text-xl font-bold ${scrolled ? "text-gray-900" : "text-white"}`}>
              POSITIVE-Next
            </span>
          </Link>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {[
              { href: "/#features", label: "Features" },
              { href: "/#about", label: "About" },
              { href: "/#testimonials", label: "Testimonials" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-primary after:transition-all ${
                  scrolled ? "text-gray-600" : "text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
            
            {/* Auth buttons - preserved as required */}
            <div className="relative z-10">
              <AuthHeader />
            </div>
          </nav>
          
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden p-2 rounded-lg ${
              scrolled ? "text-gray-600 hover:bg-gray-100" : "text-white hover:bg-white/10"
            }`}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            className="md:hidden absolute top-full left-0 right-0 bg-white shadow-lg overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <nav className="container mx-auto px-6 py-5 flex flex-col space-y-4">
              {[
                { href: "/#features", label: "Features" },
                { href: "/#about", label: "About" },
                { href: "/#testimonials", label: "Testimonials" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="py-2 text-gray-600 hover:text-primary text-lg font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-100">
                <AuthHeader />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
