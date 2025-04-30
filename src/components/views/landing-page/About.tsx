import { CheckCircle, Brain } from "lucide-react";
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
              {/* Circular gradient background */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 to-white shadow-xl" />
              
              {/* Central brain icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 rounded-full bg-gradient-to-br from-primary/90 to-blue-600/80 flex items-center justify-center">
                <Brain className="w-12 h-12 text-white" />
              </div>
              
              {/* Conceptual rings */}
              <div className="absolute inset-4 rounded-full border-2 border-dashed border-gray-200 animate-[spin_60s_linear_infinite_reverse]" />
              <div className="absolute inset-10 rounded-full border-2 border-dashed border-gray-200 animate-[spin_40s_linear_infinite]" />
              <div className="absolute inset-16 rounded-full border-2 border-dashed border-gray-200 animate-[spin_30s_linear_infinite_reverse]" />
              
              {/* Concept labels positioned around the circle */}
              {[
                { label: "Focus", angle: 0, color: "bg-blue-500" },
                { label: "Calm", angle: 60, color: "bg-emerald-500" },
                { label: "Growth", angle: 120, color: "bg-amber-500" },
                { label: "Clarity", angle: 180, color: "bg-violet-500" },
                { label: "Balance", angle: 240, color: "bg-rose-500" },
                { label: "Resilience", angle: 300, color: "bg-cyan-500" },
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
              Your AI companion for <br />
              <span className="text-primary">mental excellence</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-12 leading-relaxed max-w-2xl">
              POSITIVE-Next is a revolutionary mental fitness platform powered by advanced AI. 
              Our mission is to help you overcome mental barriers, build resilience, and reach your full potential 
              through science-backed techniques personalized to your unique needs.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Science-based approach", id: "science" },
                { label: "Personalized experience", id: "personal" },
                { label: "Continuous progress tracking", id: "progress" },
                { label: "Expert-guided techniques", id: "expert" },
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
                    {item.id === "science" && (
                      <p className="text-sm text-muted-foreground mt-1">Based on proven cognitive behavioral techniques</p>
                    )}
                    {item.id === "personal" && (
                      <p className="text-sm text-muted-foreground mt-1">Adapts to your needs, goals, and progress</p>
                    )}
                    {item.id === "progress" && (
                      <p className="text-sm text-muted-foreground mt-1">Visualize improvements in your mental fitness</p>
                    )}
                    {item.id === "expert" && (
                      <p className="text-sm text-muted-foreground mt-1">Developed with psychologists and wellness experts</p>
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
