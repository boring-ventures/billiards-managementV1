"use client";

import Link from "next/link"
import { ArrowRight, Target, BarChart3, Clock, Users } from "lucide-react"
import { motion } from "framer-motion"

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10 -z-10" />
      
      {/* Dynamic background elements */}
      <div className="absolute inset-0 -z-5 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full filter blur-3xl opacity-30 animate-pulse" style={{ animationDuration: '15s' }} />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-primary/5 rounded-full filter blur-3xl opacity-40 animate-pulse" style={{ animationDuration: '20s', animationDelay: '2s' }} />
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

            {/* Key benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                { icon: Clock, text: "Save 30% management time" },
                { icon: BarChart3, text: "Increase revenue by 25%" },
                { icon: Users, text: "Improve customer experience" },
                { icon: Target, text: "Real-time table management" }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  className="flex items-center space-x-2 text-sm text-muted-foreground"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (index * 0.1) }}
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <span>{item.text}</span>
                </motion.div>
              ))}
            </div>
            
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
          
          {/* Visual element - enhanced pool table visualization */}
          <motion.div 
            className="md:col-span-5 relative hidden md:block"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative w-full max-w-md mx-auto">
              {/* 3D-like pool table with better perspective and details */}
              <div className="relative aspect-[4/3] w-full z-10">
                {/* Table frame with shadow */}
                <div className="absolute inset-[2%] rounded-xl bg-gradient-to-br from-gray-800/90 to-gray-900/90 shadow-xl">
                  {/* Table felt */}
                  <div className="absolute inset-[5%] rounded-md bg-gradient-to-br from-emerald-800/90 to-emerald-900/80 border-4 border-gray-700/50">
                    {/* Table markings */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border border-white/10 rounded-full opacity-20"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white/20 rounded-full"></div>
                    
                    {/* Pockets */}
                    <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-gray-900/90 border border-gray-700/50"></div>
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-900/90 border border-gray-700/50"></div>
                    <div className="absolute -bottom-2 -left-2 w-5 h-5 rounded-full bg-gray-900/90 border border-gray-700/50"></div>
                    <div className="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-gray-900/90 border border-gray-700/50"></div>
                    <div className="absolute top-1/2 -left-3 transform -translate-y-1/2 w-5 h-5 rounded-full bg-gray-900/90 border border-gray-700/50"></div>
                    <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-5 h-5 rounded-full bg-gray-900/90 border border-gray-700/50"></div>
                    
                    {/* Billiards balls with realistic animations */}
                    <motion.div 
                      className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-lg"
                      style={{ 
                        boxShadow: "inset 2px 2px 4px rgba(255,255,255,0.2), inset -2px -2px 4px rgba(0,0,0,0.2)"
                      }}
                      initial={{ x: "20%", y: "30%" }}
                      animate={{ 
                        x: ["20%", "60%", "40%", "20%"],
                        y: ["30%", "50%", "70%", "30%"]
                      }}
                      transition={{ 
                        duration: 15,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/40"></div>
                    </motion.div>
                    
                    <motion.div 
                      className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg"
                      style={{ 
                        boxShadow: "inset 2px 2px 4px rgba(255,255,255,0.2), inset -2px -2px 4px rgba(0,0,0,0.2)"
                      }}
                      initial={{ x: "60%", y: "60%" }}
                      animate={{ 
                        x: ["60%", "30%", "50%", "60%"],
                        y: ["60%", "20%", "40%", "60%"]
                      }}
                      transition={{ 
                        duration: 18,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/40"></div>
                    </motion.div>
                    
                    <motion.div 
                      className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg"
                      style={{ 
                        boxShadow: "inset 2px 2px 4px rgba(255,255,255,0.2), inset -2px -2px 4px rgba(0,0,0,0.2)"
                      }}
                      initial={{ x: "30%", y: "70%" }}
                      animate={{ 
                        x: ["30%", "70%", "20%", "30%"],
                        y: ["70%", "40%", "20%", "70%"]
                      }}
                      transition={{ 
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/40"></div>
                    </motion.div>
                    
                    {/* Cue ball with highlight */}
                    <motion.div 
                      className="absolute w-8 h-8 rounded-full bg-gradient-to-br from-white to-gray-200 shadow-lg"
                      style={{ 
                        boxShadow: "inset 2px 2px 6px rgba(255,255,255,0.8), inset -2px -2px 6px rgba(0,0,0,0.1)"
                      }}
                      initial={{ x: "50%", y: "35%", opacity: 0 }}
                      animate={{ 
                        x: ["50%", "40%", "45%", "50%"],
                        y: ["35%", "50%", "45%", "35%"],
                        opacity: 1
                      }}
                      transition={{ 
                        duration: 14,
                        repeat: Infinity,
                        ease: "linear",
                        opacity: { duration: 0.5 }
                      }}
                    >
                      <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-white/80"></div>
                    </motion.div>

                    {/* Management UI overlay - floating statistics */}
                    <motion.div
                      className="absolute -right-20 top-1/4 bg-black/40 backdrop-blur-sm rounded-lg p-3 w-40 border border-white/10"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                    >
                      <div className="text-xs text-white/80 mb-1">Table Utilization</div>
                      <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-green-500 to-green-400" 
                          initial={{ width: "0%" }}
                          animate={{ width: "75%" }}
                          transition={{ delay: 1, duration: 1 }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-white/60">24h Activity</span>
                        <span className="text-[10px] text-white/90">75%</span>
                      </div>
                    </motion.div>

                    <motion.div
                      className="absolute -left-16 bottom-1/4 bg-black/40 backdrop-blur-sm rounded-lg p-3 w-32 border border-white/10"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1, duration: 0.5 }}
                    >
                      <div className="text-xs text-white/80 flex items-center justify-between">
                        <span>Revenue</span>
                        <span className="text-green-400">↑ 12%</span>
                      </div>
                      <div className="text-white text-sm font-semibold mt-1">$1,240.50</div>
                      <div className="text-[10px] text-white/60 mt-1">Today's earnings</div>
                    </motion.div>
                  </div>
                </div>
              </div>
              
              {/* Additional visual elements - billiard cue */}
              <motion.div
                className="absolute -bottom-4 -right-12 w-64 h-8 bg-gradient-to-r from-amber-800 to-amber-700 rounded-r-full transform rotate-45 origin-left"
                style={{ 
                  boxShadow: "2px 2px 10px rgba(0,0,0,0.3)"
                }}
                initial={{ opacity: 0, rotate: 35 }}
                animate={{ opacity: 1, rotate: 45 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-gray-200 rounded-r-full"></div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

