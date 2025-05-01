"use client";

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

export default function CTA() {
  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white -z-10" />
      
      <div className="container mx-auto px-6">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/90 to-blue-600 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))]" />
          
          <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-20 text-center">
            <motion.h2 
              className="text-white text-3xl md:text-4xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Ready to transform your billiards venue?
            </motion.h2>
            
            <motion.p 
              className="text-white/90 text-lg mb-10 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Start managing your billiards business more efficiently with CueMaster's all-in-one platform. 
              Get started with a free 14-day trial.
            </motion.p>
            
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link 
                href="/sign-up" 
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white text-primary font-medium hover:bg-white/90 transition-colors"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              
              <Link 
                href="#" 
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-transparent text-white border border-white/30 font-medium hover:bg-white/10 transition-colors"
              >
                View Pricing Plans
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .bg-grid-white\/10 {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.1)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e");
        }
      `}</style>
    </section>
  )
}

