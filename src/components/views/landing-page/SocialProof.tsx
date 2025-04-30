"use client"

import React from "react"

import { useEffect, useState } from "react"
import { motion, useAnimation } from "framer-motion"
import { Building, Briefcase, Globe, Laptop, Lightbulb, Rocket, Target, Zap, Brain, Heart } from "lucide-react"
import { BlurFade } from "@/components/magicui/blur-fade"
import { ShineBorder } from "@/components/magicui/shine-border"

const companies = [
  { name: "TechCorp", icon: Building },
  { name: "InnovateLabs", icon: Lightbulb },
  { name: "MindfulCo", icon: Brain },
  { name: "FutureWorks", icon: Rocket },
  { name: "ZenithHealth", icon: Heart },
  { name: "GlobalTech", icon: Globe },
  { name: "SmartSolutions", icon: Laptop },
  { name: "PowerInnovate", icon: Zap },
  { name: "TargetAchievers", icon: Target },
  { name: "BizPro", icon: Briefcase },
]

export default function SocialProof() {
  const controls = useAnimation()
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % companies.length)
    }, 3000) // Change company every 3 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    controls.start({
      opacity: [0, 1, 1, 0],
      y: [20, 0, 0, -20],
      transition: { duration: 2.5, times: [0, 0.1, 0.9, 1] },
    })
  }, [controls, currentIndex])

  return (
    <section className="py-16 bg-secondary/50 backdrop-blur-sm overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <BlurFade>
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            Trusted by Leading Organizations
          </h2>
        </BlurFade>
        
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          <ShineBorder className="rounded-full p-6 bg-background/50">
            <div className="flex justify-center items-center h-24 w-24 sm:h-32 sm:w-32">
              <motion.div key={currentIndex} animate={controls} className="flex flex-col items-center">
                {React.createElement(companies[currentIndex].icon, {
                  size: 48,
                  className: "text-primary mb-2",
                })}
                <span className="text-base sm:text-lg font-semibold text-foreground">{companies[currentIndex].name}</span>
              </motion.div>
            </div>
          </ShineBorder>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 md:gap-8">
            {companies.slice(0, 8).map((company, index) => (
              index !== currentIndex % 8 && (
                <BlurFade key={company.name} delay={index * 0.1} className="opacity-70 hover:opacity-100 transition-opacity">
                  <div className="flex flex-col items-center p-4 rounded-lg hover:bg-background/40 transition-colors">
                    {React.createElement(company.icon, {
                      size: 32,
                      className: "text-muted-foreground mb-2",
                    })}
                    <span className="text-sm font-medium text-muted-foreground">{company.name}</span>
                  </div>
                </BlurFade>
              )
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

