"use client";

import { CheckCircle, Target } from "lucide-react";
import { motion } from "framer-motion";

export default function About() {
  return (
    <section id="about" className="relative py-32 overflow-hidden">
      {/* Distinctive background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-50/80 -z-10" />
      
      {/* Asymmetric colored shapes */}
      <div className="absolute right-0 w-1/3 h-full bg-primary/5 skew-x-12 -z-10" />
      <div className="absolute left-0 top-32 w-64 h-64 rounded-full bg-blue-500/5 -z-10" />
      <div className="absolute right-1/4 bottom-16 w-96 h-96 rounded-full bg-gradient-to-br from-primary/5 to-blue-500/5 blur-3xl -z-10" />
      
      <div className="container mx-auto px-6">
        {/* Main section with asymmetric layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Left column - Image/Visualization (5/12 columns) */}
          <motion.div 
            className="lg:col-span-5 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Pool table background */}
              <div className="absolute inset-4 rounded-md bg-gradient-to-br from-emerald-800/90 to-emerald-900/80 shadow-xl" />
              <div className="absolute inset-8 rounded-md border-8 border-primary/20 bg-emerald-700/20" />
              
              {/* Central logo */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 rounded-full bg-gradient-to-br from-primary/90 to-blue-600/80 flex items-center justify-center">
                <Target className="w-12 h-12 text-white" />
              </div>
              
              {/* Pool balls */}
              <div className="absolute top-[30%] left-[30%] w-8 h-8 rounded-full bg-red-500 shadow-lg" />
              <div className="absolute top-[40%] left-[60%] w-8 h-8 rounded-full bg-blue-500 shadow-lg" />
              <div className="absolute top-[60%] left-[35%] w-8 h-8 rounded-full bg-yellow-500 shadow-lg" />
              <div className="absolute top-[65%] left-[65%] w-8 h-8 rounded-full bg-green-500 shadow-lg" />
              <div className="absolute top-[25%] left-[50%] w-8 h-8 rounded-full bg-purple-500 shadow-lg" />
              <div className="absolute top-[75%] left-[50%] w-8 h-8 rounded-full bg-orange-500 shadow-lg" />
              
              {/* Feature labels positioned around the visual */}
              {[
                { label: "Tables", angle: 0, color: "bg-blue-500" },
                { label: "Payments", angle: 60, color: "bg-emerald-500" },
                { label: "Inventory", angle: 120, color: "bg-amber-500" },
                { label: "Staff", angle: 180, color: "bg-violet-500" },
                { label: "Analytics", angle: 240, color: "bg-rose-500" },
                { label: "Reporting", angle: 300, color: "bg-cyan-500" },
              ].map((concept, i) => {
                const radius = 45; // % of container
                const radians = (concept.angle * Math.PI) / 180;
                const x = 50 + radius * Math.cos(radians);
                const y = 50 + radius * Math.sin(radians);
                
                return (
                  <div 
                    key={concept.label}
                    className={`absolute ${concept.color} text-white text-xs font-medium px-3 py-1 rounded-full`}
                    style={{ 
                      left: `${x}%`, 
                      top: `${y}%`, 
                      transform: "translate(-50%, -50%)",
                      opacity: 0.9,
                      animation: `pulse 3s infinite ease-in-out ${i * 0.5}s`
                    }}
                  >
                    {concept.label}
                  </div>
                );
              })}
            </div>
          </motion.div>
          
          {/* Right column - Text content (7/12 columns) */}
          <motion.div 
            className="lg:col-span-7"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="bg-gradient-to-r from-primary to-primary-muted p-1 w-20 h-1 mb-6 rounded-full" />
            <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
              The complete solution for <br />
              <span className="text-primary">billiards venues</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-12 leading-relaxed max-w-2xl">
              CueMaster is a comprehensive management platform built specifically for pool halls and billiards venues. 
              Our all-in-one system helps you streamline operations, maximize revenue, and deliver exceptional customer experiences.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Multi-tenant architecture", id: "multi-tenant" },
                { label: "Real-time monitoring", id: "realtime" },
                { label: "Customizable settings", id: "custom" },
                { label: "Comprehensive reporting", id: "reporting" },
              ].map((item, i) => (
                <motion.div
                  key={item.id}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + (i * 0.1) }}
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    {item.id === "multi-tenant" && (
                      <p className="text-sm text-muted-foreground mt-1">Manage multiple venues from a single dashboard</p>
                    )}
                    {item.id === "realtime" && (
                      <p className="text-sm text-muted-foreground mt-1">Track table usage and revenue in real-time</p>
                    )}
                    {item.id === "custom" && (
                      <p className="text-sm text-muted-foreground mt-1">Set venue-specific pricing, hours, and rules</p>
                    )}
                    {item.id === "reporting" && (
                      <p className="text-sm text-muted-foreground mt-1">Gain insights with detailed business analytics</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Pulsing animation keyframes */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </section>
  );
}
