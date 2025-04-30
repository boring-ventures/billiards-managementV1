import { Brain, Heart, Zap, Target, Smile, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    id: "mental-fitness",
    icon: Brain,
    title: "Mental Fitness",
    description:
      "Train your mind to overcome negative thoughts and build lasting mental resilience through AI-guided exercises.",
    color: "from-blue-500/20 to-blue-600/5",
    accentColor: "bg-blue-500",
  },
  {
    id: "emotional-intelligence",
    icon: Heart,
    title: "Emotional Intelligence",
    description:
      "Develop a deeper understanding of your emotions with personalized insights and practical management techniques.",
    color: "from-rose-500/20 to-rose-600/5",
    accentColor: "bg-rose-500",
  },
  {
    id: "peak-performance",
    icon: Zap,
    title: "Peak Performance",
    description:
      "Unlock your full potential with focused mental training designed to optimize your productivity and creativity.",
    color: "from-amber-500/20 to-amber-600/5",
    accentColor: "bg-amber-500",
  },
  {
    id: "goal-setting",
    icon: Target,
    title: "Goal Setting",
    description:
      "Learn to set and achieve meaningful goals that align perfectly with your values and deepest aspirations.",
    color: "from-emerald-500/20 to-emerald-600/5",
    accentColor: "bg-emerald-500",
  },
  {
    id: "stress-management",
    icon: Smile,
    title: "Stress Management",
    description:
      "Discover evidence-based techniques to reduce stress and maintain a calm, focused state in any situation.",
    color: "from-violet-500/20 to-violet-600/5",
    accentColor: "bg-violet-500",
  },
  {
    id: "personal-growth",
    icon: TrendingUp,
    title: "Personal Growth",
    description:
      "Embark on a journey of continuous self-improvement with personalized growth plans and progress tracking.",
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
              Strengthen your mind with precision-designed
              <span className="text-primary"> mental tools</span>
            </h2>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="text-lg text-muted-foreground">
              POSITIVE-Next combines neuroscience research with AI technology to deliver customized mental fitness exercises that adapt to your unique needs and goals. Our science-backed approach builds resilience, focus, and emotional balance.
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
                  <span className="text-sm font-medium text-primary">Learn technique</span>
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
