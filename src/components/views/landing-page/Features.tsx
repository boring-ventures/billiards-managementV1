"use client";

import { LayoutGrid, DollarSign, Clock, Clipboard, Users, BarChart } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    id: "table-management",
    icon: LayoutGrid,
    title: "Table Management",
    description:
      "Efficiently organize and monitor all your pool tables with real-time availability tracking and smart booking system.",
    color: "from-blue-500/20 to-blue-600/5",
    accentColor: "bg-blue-500",
  },
  {
    id: "point-of-sale",
    icon: DollarSign,
    title: "Point of Sale",
    description:
      "Seamlessly process payments, manage tabs, and handle food and beverage orders with our integrated POS system.",
    color: "from-rose-500/20 to-rose-600/5",
    accentColor: "bg-rose-500",
  },
  {
    id: "time-tracking",
    icon: Clock,
    title: "Time Tracking",
    description:
      "Automatically track table usage time and calculate charges with customizable hourly rates and special promotions.",
    color: "from-amber-500/20 to-amber-600/5",
    accentColor: "bg-amber-500",
  },
  {
    id: "inventory-management",
    icon: Clipboard,
    title: "Inventory Management",
    description:
      "Track stock levels for equipment, merchandise, food and beverages with automated alerts for low inventory items.",
    color: "from-emerald-500/20 to-emerald-600/5",
    accentColor: "bg-emerald-500",
  },
  {
    id: "staff-management",
    icon: Users,
    title: "Staff Management",
    description:
      "Manage employee schedules, track work hours, and assign role-based permissions with comprehensive staff controls.",
    color: "from-violet-500/20 to-violet-600/5",
    accentColor: "bg-violet-500",
  },
  {
    id: "reporting-analytics",
    icon: BarChart,
    title: "Reporting & Analytics",
    description:
      "Gain valuable insights into your business performance with detailed financial reports and usage analytics.",
    color: "from-cyan-500/20 to-cyan-600/5",
    accentColor: "bg-cyan-500",
  },
];

export default function Features() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } },
  };

  return (
    <section id="features" className="relative py-32 overflow-hidden">
      {/* Background with diagonal cutout */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--primary-rgb),0.05),transparent_50%)] -z-10" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      
      {/* Diagonal separator line */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-background to-transparent skew-y-1 -translate-y-12" />
      
      <div className="container mx-auto px-6">
        {/* Section header with asymmetric layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Run your venue with powerful
              <span className="text-primary"> management tools</span>
            </h2>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="text-lg text-muted-foreground">
              CueMaster combines all the tools you need to efficiently manage your billiards venue in one integrated platform. From table bookings to financial reporting, our comprehensive system streamlines operations and maximizes revenue.
            </p>
          </motion.div>
        </div>
        
        {/* Features grid with staggered animation */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <motion.div 
              key={feature.id}
              className="relative"
              variants={item}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} -z-10 opacity-60 group-hover:opacity-80 transition-opacity duration-500`} />
              
              <div className="group h-full flex flex-col">
                <div className="flex items-start">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${feature.accentColor} bg-opacity-10 flex items-center justify-center mb-5`}>
                    <feature.icon className={`w-6 h-6 text-${feature.accentColor.substring(3)}`} />
                  </div>
                  <div className="w-full h-px bg-gradient-to-r from-gray-200 to-transparent self-center ml-4" />
                </div>
                
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground flex-grow mb-4">{feature.description}</p>
                
                <div className="mt-auto pt-2 flex items-center opacity-70 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-medium text-primary">Learn more</span>
                  <svg className="w-4 h-4 ml-1 text-primary group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
