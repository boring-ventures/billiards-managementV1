"use client";

import Link from "next/link"
import { ArrowRight, Target } from "lucide-react"
import { motion } from "framer-motion"

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 -z-10" />
      
      {/* Subtle background elements */}
      <div className="absolute inset-0 -z-5 overflow-hidden">
        <div className="absolute top-1/3 right-1/5 w-80 h-80 bg-primary/5 rounded-full filter blur-3xl opacity-50" />
        <div className="absolute bottom-1/3 left-1/5 w-72 h-72 bg-blue-500/5 rounded-full filter blur-3xl opacity-40" />
      </div>
      
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Text content - takes up 7/12 columns on desktop */}
          <motion.div 
            className="md:col-span-7 text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center px-4 py-2 mb-6 rounded-full border border-primary/10 bg-primary/5">
              <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
              <span className="text-sm font-medium text-primary">Smart Billiards Management</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Streamline your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600"> billiards business</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-xl mb-8">
              Comprehensive management system for billiards venues, combining booking, point-of-sale, and analytics in one elegant platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/sign-up" 
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              
              <Link 
                href="#features" 
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
              >
                Explore Features
              </Link>
            </div>
          </motion.div>
          
          {/* Visual element */}
          <motion.div 
            className="md:col-span-5 relative hidden md:block"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative aspect-square w-full max-w-md mx-auto">
              {/* Modern pool table visualization */}
              <div className="absolute inset-[10%] rounded-xl bg-gradient-to-br from-secondary/50 to-background border border-primary/10 shadow-lg flex items-center justify-center overflow-hidden">
                {/* Pool table surface */}
                <div className="relative w-[90%] h-[90%] rounded-lg bg-emerald-900/10 border-4 border-primary/20">
                  {/* Corner pockets - simplified */}
                  <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-gray-700/30"></div>
                  <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-gray-700/30"></div>
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-gray-700/30"></div>
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-gray-700/30"></div>
                  
                  {/* Stylized pool balls */}
                  <motion.div 
                    className="absolute top-1/3 left-1/4 w-8 h-8 rounded-full bg-red-500/80 shadow-md"
                    animate={{ 
                      x: [0, 10, 0],
                      y: [0, -5, 0]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  
                  <motion.div 
                    className="absolute top-1/2 right-1/3 w-8 h-8 rounded-full bg-blue-500/80 shadow-md"
                    animate={{ 
                      x: [0, -15, 0],
                      y: [0, 8, 0]
                    }}
                    transition={{ 
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5
                    }}
                  />
                  
                  <motion.div 
                    className="absolute bottom-1/3 left-1/2 w-8 h-8 rounded-full bg-yellow-500/80 shadow-md"
                    animate={{ 
                      x: [0, 12, 0],
                      y: [0, 10, 0]
                    }}
                    transition={{ 
                      duration: 4.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1
                    }}
                  />
                  
                  {/* Cue ball with subtle highlight */}
                  <motion.div 
                    className="absolute top-2/3 left-1/4 w-10 h-10 rounded-full bg-white shadow-md"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    <div className="absolute top-1 left-2 w-2 h-2 rounded-full bg-white/80"></div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

