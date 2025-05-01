"use client";

import { LayoutGrid, DollarSign, Clock, Clipboard, Users, BarChart, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    id: "table-management",
    icon: LayoutGrid,
    title: "Table Management",
    description:
      "Efficiently organize and monitor all your pool tables with real-time availability tracking and smart booking system.",
    color: "bg-blue-500",
    benefits: ["Reduce wait times", "Optimize table usage", "Prevent double-bookings"]
  },
  {
    id: "point-of-sale",
    icon: DollarSign,
    title: "Point of Sale",
    description:
      "Seamlessly process payments, manage tabs, and handle food and beverage orders with our integrated POS system.",
    color: "bg-rose-500",
    benefits: ["Streamline checkouts", "Track inventory", "Process multiple payment types"]
  },
  {
    id: "time-tracking",
    icon: Clock,
    title: "Time Tracking",
    description:
      "Automatically track table usage time and calculate charges with customizable hourly rates and special promotions.",
    color: "bg-amber-500",
    benefits: ["Accurate billing", "Custom hourly rates", "Time-based promotions"]
  },
  {
    id: "inventory-management",
    icon: Clipboard,
    title: "Inventory Management",
    description:
      "Track stock levels for equipment, merchandise, food and beverages with automated alerts for low inventory items.",
    color: "bg-emerald-500",
    benefits: ["Prevent stockouts", "Auto-reorder points", "Usage analytics"]
  },
  {
    id: "staff-management",
    icon: Users,
    title: "Staff Management",
    description:
      "Manage employee schedules, track work hours, and assign role-based permissions with comprehensive staff controls.",
    color: "bg-violet-500",
    benefits: ["Schedule optimization", "Performance tracking", "Role-based access"]
  },
  {
    id: "reporting-analytics",
    icon: BarChart,
    title: "Reporting & Analytics",
    description:
      "Gain valuable insights into your business performance with detailed financial reports and usage analytics.",
    color: "bg-cyan-500",
    benefits: ["Revenue forecasting", "Identify trends", "Data-driven decisions"]
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative">
      {/* Background with subtle patterns */}
      <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-50 -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.04),transparent)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(16,185,129,0.04),transparent)] -z-10" />
      
      <div className="container mx-auto px-6">
        <div className="mb-16 max-w-3xl mx-auto text-center">
          <motion.div 
            className="inline-flex items-center px-4 py-2 mb-4 rounded-full bg-primary/5 border border-primary/10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-sm font-medium text-primary">Built for Billiards Business</span>
          </motion.div>
          
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-4 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            All the tools you need to <span className="text-primary">manage your venue</span>
          </motion.h2>
          
          <motion.p 
            className="text-lg text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Our comprehensive platform streamlines operations, maximizes revenue, and enhances customer experience - all in one integrated solution.
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {features.map((feature, index) => (
            <motion.div 
              key={feature.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/10 transition-all duration-300 group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-12 h-12 ${feature.color}/10 rounded-lg flex items-center justify-center`}>
                    <feature.icon className={`w-6 h-6 text-${feature.color.substring(3)}`} />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                </div>
                
                <p className="text-muted-foreground mb-6">{feature.description}</p>
                
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{benefit}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="h-[3px] w-full bg-gray-100 mt-6 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${feature.color}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 + (index * 0.1) }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Testimonial or stats section */}
        <motion.div 
          className="mt-24 rounded-xl bg-gradient-to-br from-primary/90 to-blue-600 text-white p-8 shadow-lg relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-4">Trusted by 500+ venues worldwide</div>
              <p className="text-white/80 mb-6">Join hundreds of billiards businesses that have transformed their operations with our platform.</p>
              
              <div className="flex items-center space-x-4">
                <motion.div 
                  className="h-14 w-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-xl font-bold border border-white/20"
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  96%
                </motion.div>
                <div>
                  <div className="font-semibold">Customer satisfaction</div>
                  <div className="text-sm text-white/70">Based on customer surveys</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "45%", label: "Average revenue increase" },
                { value: "12K+", label: "Hours saved monthly" },
                { value: "98%", label: "Customer retention" },
                { value: "24/7", label: "Support available" }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + (i * 0.1), duration: 0.4 }}
                >
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-white/70">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
