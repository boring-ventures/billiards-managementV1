"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Target } from "lucide-react";
import { AuthHeader } from "./auth-header";
import { motion } from "framer-motion";

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
      scrolled ? "bg-white/95 shadow-sm py-3" : "bg-transparent py-4"
    }`}>
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className={`${
              scrolled ? "bg-primary text-white" : "bg-white/10 text-white"
            } p-1.5 rounded-md transition-colors`}>
              <Target className="h-5 w-5" />
            </div>
            <span className={`text-lg font-semibold ${scrolled ? "text-gray-900" : "text-white"}`}>
              CueMaster
            </span>
          </Link>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="#features"
              className={`text-sm font-medium hover:text-primary transition-colors ${
                scrolled ? "text-gray-700" : "text-white"
              }`}
            >
              Features
            </Link>
            
            <Link
              href="#pricing"
              className={`text-sm font-medium hover:text-primary transition-colors ${
                scrolled ? "text-gray-700" : "text-white"
              }`}
            >
              Pricing
            </Link>
            
            {/* Auth buttons */}
            <div className="pl-2">
              <AuthHeader />
            </div>
          </nav>
          
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden p-2 ${
              scrolled ? "text-gray-700" : "text-white"
            }`}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <motion.div 
          className="md:hidden absolute top-full left-0 right-0 bg-white shadow-md"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
        >
          <nav className="container mx-auto px-6 py-4 flex flex-col">
            <Link
              href="#features"
              className="py-2 text-gray-700 hover:text-primary text-base"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            
            <Link
              href="#pricing"
              className="py-2 text-gray-700 hover:text-primary text-base"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            
            <div className="pt-3 mt-3 border-t border-gray-100">
              <AuthHeader />
            </div>
          </nav>
        </motion.div>
      )}
    </header>
  );
}
