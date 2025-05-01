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
  },
  {
    id: "point-of-sale",
    icon: DollarSign,
    title: "Point of Sale",
    description:
      "Seamlessly process payments, manage tabs, and handle food and beverage orders with our integrated POS system.",
  },
  {
    id: "time-tracking",
    icon: Clock,
    title: "Time Tracking",
    description:
      "Automatically track table usage time and calculate charges with customizable hourly rates and special promotions.",
  },
  {
    id: "inventory-management",
    icon: Clipboard,
    title: "Inventory Management",
    description:
      "Track stock levels for equipment, merchandise, food and beverages with automated alerts for low inventory items.",
  },
  {
    id: "staff-management",
    icon: Users,
    title: "Staff Management",
    description:
      "Manage employee schedules, track work hours, and assign role-based permissions with comprehensive staff controls.",
  },
  {
    id: "reporting-analytics",
    icon: BarChart,
    title: "Reporting & Analytics",
    description:
      "Gain valuable insights into your business performance with detailed financial reports and usage analytics.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6">
        <div className="mb-16 text-center">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Powerful Management Tools
          </motion.h2>
          <motion.p 
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Everything you need to run and grow your billiards business in one integrated platform
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {features.map((feature, index) => (
            <motion.div 
              key={feature.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/10 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-5">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
