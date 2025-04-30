"use client";

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 -z-10" />
      
      {/* Animated nodes/particles representing AI */}
      <div className="absolute inset-0 -z-5">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full filter blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl opacity-40 animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full filter blur-3xl opacity-50 animate-pulse" style={{ animationDelay: "2s" }} />
        
        {/* Neural network visualization */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div 
            key={`node-${i}`}
            className="absolute rounded-full bg-primary/20 backdrop-blur-md"
            style={{
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              top: `${Math.random() * 80 + 10}%`,
              left: `${Math.random() * 80 + 10}%`,
              animation: `float ${Math.random() * 10 + 10}s infinite ease-in-out`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>
      
      {/* Asymmetric design - left-aligned content with visual interest on right */}
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Text content - takes up 7/12 columns on desktop */}
          <motion.div 
            className="md:col-span-7 text-left"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center px-4 py-2 mb-6 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></div>
              <span className="text-sm font-medium text-primary">AI-Powered Mental Wellness</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
              Transform your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600"> mind's potential</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
              POSITIVE-Next uses advanced AI to help you overcome mental barriers, build resilience, and reach your highest state of wellbeing.
            </p>
            
            <div>
              <Link 
                href="/sign-up" 
                className="group relative inline-flex items-center px-8 py-4 overflow-hidden rounded-full bg-primary text-white shadow-lg hover:shadow-primary/20 transition-all duration-500"
              >
                <span className="relative z-10 flex items-center font-medium text-lg">
                  Begin Your Journey 
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
              </Link>
            </div>
          </motion.div>
          
          {/* Visual element - takes up 5/12 columns on desktop */}
          <motion.div 
            className="md:col-span-5 relative hidden md:block"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            <div className="relative aspect-square w-full max-w-md mx-auto">
              {/* Orbital elements */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-5/6 h-5/6 rounded-full">
                  {/* Animated orbital ring */}
                  <div className="absolute inset-0 border border-primary/20 rounded-full rotate-45 animate-[spin_40s_linear_infinite]"></div>
                  <div className="absolute inset-2 border border-blue-500/20 rounded-full -rotate-12 animate-[spin_30s_linear_infinite_reverse]"></div>
                  <div className="absolute inset-8 border border-violet-500/20 rounded-full rotate-90 animate-[spin_20s_linear_infinite]"></div>
                  
                  {/* Center element */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-primary/90 to-blue-600/90 blur-sm"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 animate-pulse flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" strokeWidth="1.5"/>
                        <path d="M8 12L10.5 14.5L16 9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Orbital dots */}
                  {[0, 1, 2].map((i) => (
                    <div 
                      key={`dot-${i}`}
                      className="absolute w-3 h-3 rounded-full bg-primary"
                      style={{
                        top: '50%',
                        left: '50%',
                        marginLeft: '-1.5px',
                        marginTop: '-1.5px',
                        transformOrigin: 'center',
                        transform: `rotate(${i * 120}deg) translateX(${i * 100 + 140}px)`,
                        animation: `orbit ${10 + i * 5}s linear infinite${i % 2 ? ' reverse' : ''}`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"></div>
        </div>
        <span className="text-xs text-muted-foreground/50 mt-2">Scroll</span>
      </div>
      
      {/* Custom animation keyframes */}
      <style jsx>{`
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(140px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(140px) rotate(-360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
      `}</style>
    </section>
  );
}

