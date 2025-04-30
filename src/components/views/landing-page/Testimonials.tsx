import { Star } from "lucide-react";
import { BlurFade } from "@/components/magicui/blur-fade";
import { ShineBorder } from "@/components/magicui/shine-border";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";

const testimonials = [
  {
    id: "t1",
    quote:
      "POSITIVE-Next has completely transformed my mindset. I'm more productive and happier than ever!",
    author: "Sarah J., Entrepreneur",
    rating: 5,
    imagePath: "/images/testimonials/person1.jpg",
  },
  {
    id: "t2",
    quote:
      "As a CEO, mental fitness is crucial. This app has been a game-changer for my leadership skills.",
    author: "Michael R., CEO",
    rating: 5,
    imagePath: "/images/testimonials/person2.jpg",
  },
  {
    id: "t3",
    quote:
      "I've tried many self-improvement apps, but POSITIVE-Next stands out with its practical approach.",
    author: "Emily L., Life Coach",
    rating: 5,
    imagePath: "/images/testimonials/person3.jpg",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
      <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <BlurFade className="text-center mb-16">
          <AnimatedShinyText>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Our Users Say
            </h2>
          </AnimatedShinyText>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover how POSITIVE-Next has transformed the lives of our users
          </p>
        </BlurFade>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <BlurFade
              key={testimonial.id}
              delay={index * 0.15}
            >
              <ShineBorder
                className="rounded-xl overflow-hidden group hover:shadow-lg transition-all duration-300 h-full bg-card/50 backdrop-blur-sm hover:-translate-y-1"
                borderWidth={1}
                color="rgba(var(--primary), 0.5)"
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={`${testimonial.id}-star-${i}`}
                        className="h-5 w-5 text-primary fill-current"
                      />
                    ))}
                  </div>
                  
                  <div className="mb-4 flex-grow">
                    <div className="relative">
                      <span className="absolute -top-6 -left-2 text-6xl text-primary/20 font-serif">"</span>
                      <p className="text-foreground relative z-10 italic">
                        {testimonial.quote}
                      </p>
                      <span className="absolute -bottom-10 -right-2 text-6xl text-primary/20 font-serif">"</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                      <span className="text-primary font-medium">{testimonial.author.charAt(0)}</span>
                    </div>
                    <p className="text-primary font-semibold">{testimonial.author}</p>
                  </div>
                </div>
              </ShineBorder>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
