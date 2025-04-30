import { CheckCircle } from "lucide-react";
import { ShineBorder } from "@/components/magicui/shine-border";
import { BlurFade } from "@/components/magicui/blur-fade";
import { SparklesText } from "@/components/magicui/sparkles-text";
import { BoxReveal } from "@/components/magicui/box-reveal";

export default function About() {
  return (
    <section id="about" className="py-24 bg-secondary/40 backdrop-blur-sm relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl opacity-40 -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl opacity-40 -z-10" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <BlurFade className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-block mb-6">
            <SparklesText text="About POSITIVE-Next" />
          </div>
          <p className="text-lg text-muted-foreground">
            POSITIVE-Next is a revolutionary app designed to help you harness
            the power of your mind. Our mission is to empower individuals to
            overcome mental saboteurs and achieve their full potential.
          </p>
        </BlurFade>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <BoxReveal>
            <ShineBorder 
              className="space-y-6 p-8 rounded-xl bg-background/40 backdrop-blur-sm"
              borderWidth={1}
              color="rgba(var(--primary), 0.5)"
            >
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                Why Choose POSITIVE-Next?
              </h3>
              {[
                { id: "science", text: "Science-based approach", delay: 0 },
                { id: "personal", text: "Personalized experience", delay: 0.1 },
                { id: "progress", text: "Track your progress", delay: 0.2 },
                { id: "expert", text: "Expert guidance", delay: 0.3 },
              ].map((item) => (
                <BlurFade
                  key={item.id}
                  delay={item.delay}
                  className="flex items-center space-x-3 p-2 hover:bg-primary/5 rounded-lg transition-colors"
                >
                  <CheckCircle className="h-6 w-6 text-primary" />
                  <span className="text-foreground">{item.text}</span>
                </BlurFade>
              ))}
            </ShineBorder>
          </BoxReveal>

          <BoxReveal>
            <ShineBorder 
              className="bg-primary/10 rounded-xl p-8 backdrop-blur-sm"
              borderWidth={1}
              color="rgba(var(--primary), 0.5)"
            >
              <BlurFade>
                <h3 className="text-2xl font-semibold text-foreground mb-4">
                  Our Vision
                </h3>
                <p className="text-muted-foreground mb-6">
                  We envision a world where everyone has the tools and knowledge to
                  cultivate a positive, resilient mindset. Through POSITIVE-Next,
                  we&apos;re making mental fitness accessible and engaging for all.
                </p>
                <div className="relative h-40 w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <div className="text-xl font-medium text-foreground/80">
                    "Transforming minds, one thought at a time."
                  </div>
                </div>
              </BlurFade>
            </ShineBorder>
          </BoxReveal>
        </div>
      </div>
    </section>
  );
}
