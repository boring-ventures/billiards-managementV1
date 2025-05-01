"use client";

import Link from "next/link"
import { ArrowRight, CheckCircle, ArrowUpRightSquare } from "lucide-react"
import { motion } from "framer-motion"

export default function CTA() {
  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white -z-10" />
      <div className="absolute right-0 -top-20 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl opacity-70" />
      <div className="absolute left-0 bottom-0 w-80 h-80 bg-blue-500/5 rounded-full filter blur-3xl opacity-60" />
      
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Plans and pricing */}
          <div>
            <motion.div 
              className="inline-flex items-center px-4 py-2 mb-6 rounded-full bg-primary/5 border border-primary/10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-sm font-medium text-primary">Plans for businesses of all sizes</span>
            </motion.div>
            
            <motion.h2 
              className="text-3xl md:text-4xl font-bold mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Simple, transparent pricing
            </motion.h2>
            
            <motion.p
              className="text-lg text-muted-foreground mb-8 max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Choose the plan that works best for your business. All plans include a 14-day free trial with no credit card required.
            </motion.p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {[
                {
                  name: "Basic",
                  price: "$79",
                  period: "/month",
                  description: "Perfect for smaller venues with up to 10 tables",
                  features: [
                    "All core features",
                    "Up to 10 tables",
                    "3 staff accounts",
                    "Email support"
                  ]
                },
                {
                  name: "Premium",
                  price: "$149",
                  period: "/month",
                  description: "For growing venues with additional requirements",
                  features: [
                    "All Basic features",
                    "Unlimited tables",
                    "15 staff accounts",
                    "Priority support",
                    "Advanced analytics"
                  ],
                  featured: true
                }
              ].map((plan, index) => (
                <motion.div
                  key={plan.name}
                  className={`rounded-xl p-6 border ${plan.featured ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + (index * 0.1) }}
                >
                  {plan.featured && (
                    <div className="text-xs font-semibold uppercase text-primary mb-2">Most popular</div>
                  )}
                  <div className="text-xl font-bold mb-1">{plan.name}</div>
                  <div className="flex items-baseline mb-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex text-sm">
                        <CheckCircle className="h-4 w-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                        <span className={plan.featured ? 'text-foreground' : 'text-muted-foreground'}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link
                    href="/sign-up"
                    className={`inline-flex w-full items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium ${
                      plan.featured
                        ? 'bg-primary text-white hover:bg-primary/90'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    } transition-colors`}
                  >
                    {plan.featured ? 'Start free trial' : 'Learn more'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </motion.div>
              ))}
            </div>
            
            <motion.div
              className="text-sm text-muted-foreground flex items-center"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <span>Need a custom plan? </span>
              <Link href="/contact" className="text-primary inline-flex items-center ml-1 hover:underline">
                Contact sales <ArrowUpRightSquare className="ml-1 h-3 w-3" />
              </Link>
            </motion.div>
          </div>
          
          {/* CTA card */}
          <motion.div
            className="relative rounded-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-blue-600 z-0" />
            <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,rgba(255,255,255,0.5))] z-10" />
            
            <div className="relative z-20 p-8 md:p-10">
              <div className="text-white text-2xl md:text-3xl font-bold mb-4">
                Ready to transform your billiards venue?
              </div>
              
              <p className="text-white/90 text-lg mb-8">
                Join hundreds of businesses already using CueMaster to streamline operations, increase revenue, and enhance customer satisfaction.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {[
                  "Set up in minutes",
                  "No credit card required",
                  "Cancel anytime",
                  "Free 14-day trial"
                ].map((item, i) => (
                  <div key={i} className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" />
                    <span className="text-white/90">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
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
                  Schedule Demo
                </Link>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/20">
                <div className="text-sm text-white/70 mb-4">Trusted by leading venues worldwide</div>
                <div className="flex flex-wrap gap-4 items-center">
                  {['Cue Masters', 'Billiards Pro', 'Eight Ball Club', 'Corner Pocket'].map((brand, i) => (
                    <div key={i} className="text-white/80 font-semibold">
                      {brand}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
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

