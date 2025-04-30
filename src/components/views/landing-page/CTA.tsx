"use client";

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

export default function CTA() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background element - cinematic gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-blue-500/5 -z-10" />
      
      {/* Animated subtle waves */}
      <div className="absolute inset-0 opacity-10 -z-5">
        <svg 
          className="absolute w-full h-full" 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
        >
          <path 
            d="M0,50 C30,60 70,40 100,50 L100,100 L0,100 Z" 
            className="fill-primary animate-[wave_15s_ease-in-out_infinite_alternate]"
          />
          <path 
            d="M0,60 C40,70 60,50 100,60 L100,100 L0,100 Z" 
            className="fill-blue-500/30 animate-[wave_18s_ease-in-out_infinite_alternate_reverse]"
            style={{ animationDelay: "-2s" }}
          />
        </svg>
      </div>
      
      {/* Content with asymmetric design */}
      <div className="container mx-auto px-6">
        <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
          {/* Diagonal accent */}
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-b from-primary/10 to-blue-500/10 skew-x-12" />
          
          {/* Abstract decorative elements */}
          <div className="absolute top-8 left-8 w-20 h-20 rounded-full border-2 border-primary/20 -z-10" />
          <div className="absolute bottom-12 right-12 w-16 h-16 rounded-full border-2 border-blue-500/20 -z-10" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 md:p-12">
            {/* Text content - 7 columns on desktop */}
            <motion.div 
              className="lg:col-span-7 relative z-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Ready to elevate your 
                <span className="text-primary"> billiards business</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                Join pool halls and billiards venues across the country that are increasing efficiency, improving customer experience, and maximizing profit with CueMaster.
              </p>
              
              {/* Features list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {[
                  "Streamlined venue operations",
                  "Real-time table management",
                  "Integrated point of sale",
                  "Comprehensive business analytics"
                ].map((feature, i) => (
                  <motion.div 
                    key={feature} 
                    className="flex items-center space-x-2"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.5 + (i * 0.1) }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-base font-medium">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* CTA form - 5 columns on desktop */}
            <motion.div 
              className="lg:col-span-5 relative z-10"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
                <h3 className="text-xl font-semibold mb-6">Get started with CueMaster today</h3>
                <p className="text-muted-foreground mb-6">
                  Schedule a free demo and see how CueMaster can transform your billiards venue.
                </p>
                
                <Link 
                  href="/sign-up" 
                  className="group relative w-full inline-flex items-center justify-center px-6 py-4 rounded-lg bg-gradient-to-r from-primary to-blue-600 text-white font-medium text-lg shadow-lg hover:shadow-primary/25 transition-all duration-300"
                >
                  <span>Request Demo</span>
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
                
                <p className="text-sm text-center text-muted-foreground mt-6">
                  No commitment required. See the difference for yourself.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes wave {
          0% { d: path("M0,50 C30,60 70,40 100,50 L100,100 L0,100 Z"); }
          50% { d: path("M0,50 C20,42 80,58 100,50 L100,100 L0,100 Z"); }
          100% { d: path("M0,50 C40,45 60,55 100,50 L100,100 L0,100 Z"); }
        }
      `}</style>
    </section>
  )
}

