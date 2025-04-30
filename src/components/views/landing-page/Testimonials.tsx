"use client";

import { Star } from "lucide-react";
import { motion } from "framer-motion";

// Realistic testimonial data for billiards venues
const testimonials = [
  {
    id: "t1",
    quote:
      "CueMaster has streamlined our entire operation. We've reduced wait times, increased table utilization, and our customers love the seamless experience. Our revenue is up 22% since implementation.",
    author: "James K.",
    title: "Owner, Cue's & Brews Pool Hall",
    rating: 5,
    imagePath: "/images/testimonials/person1.jpg",
  },
  {
    id: "t2",
    quote:
      "As the manager of 3 billiards venues, CueMaster's multi-tenant system has been a game-changer. I can monitor all locations from one dashboard and the detailed analytics help me make smarter business decisions.",
    author: "Michelle T.",
    title: "Regional Manager, Pocket Aces",
    rating: 5,
    imagePath: "/images/testimonials/person2.jpg",
  },
  {
    id: "t3",
    quote:
      "I've tried several management systems, but CueMaster is the only one specifically designed for pool halls. The table tracking and integrated POS have eliminated our manual processes and reduced staff errors by 90%.",
    author: "Robert L.",
    title: "Director, Grand Slam Billiards",
    rating: 5,
    imagePath: "/images/testimonials/person3.jpg",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative py-32 overflow-hidden">
      {/* Distinctive background */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-white -z-10" />
      
      {/* Abstract background elements */}
      <div className="absolute -left-64 top-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl opacity-70 -z-5" />
      <div className="absolute right-0 bottom-0 w-1/3 h-2/3 bg-blue-500/5 skew-y-6 -z-5" />
      
      <div className="container mx-auto px-6">
        {/* Two-column asymmetric layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* Left column - Header (4/12) */}
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-1 w-16 h-1 mb-8 rounded-full" />
              <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                Trusted by venue owners
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                See how CueMaster is helping billiards venues across the country improve operations, enhance customer experiences, and increase profitability.
              </p>
              
              <div className="flex items-center space-x-2 mb-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-6 w-6 text-amber-400 fill-amber-400" />
                ))}
                <span className="ml-2 text-lg font-medium">4.9/5</span>
                <span className="text-muted-foreground text-sm ml-2">(85+ reviews)</span>
              </div>
            </motion.div>
          </div>
          
          {/* Right column - Testimonials (8/12) */}
          <div className="lg:col-span-8">
            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute -top-6 -left-6 w-12 h-12 rounded-full border-2 border-primary/20 -z-10" />
              <div className="absolute top-1/4 -right-8 w-16 h-16 rounded-full border-2 border-blue-500/20 -z-10" />
              <div className="absolute bottom-0 left-1/3 w-20 h-20 rounded-full border-2 border-violet-500/20 -z-10" />
              
              {/* Quote marks */}
              <div className="absolute -top-20 left-10 text-9xl text-primary/10 font-serif">"</div>
              <div className="absolute -bottom-20 right-10 text-9xl text-primary/10 font-serif">"</div>
              
              {/* Testimonial cards with staggered layout */}
              <div>
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.id}
                    className={`relative bg-white rounded-2xl p-8 shadow-lg mb-6 ${
                      index === 1 ? 'lg:ml-12' : index === 2 ? 'lg:ml-24' : ''
                    }`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                  >
                    {/* Testimonial content */}
                    <div className="flex flex-col">
                      {/* Rating */}
                      <div className="flex mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                      
                      {/* Quote */}
                      <p className="text-foreground mb-4 italic">
                        "{testimonial.quote}"
                      </p>
                      
                      {/* Author info */}
                      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                          {testimonial.author.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <p className="font-semibold">{testimonial.author}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
