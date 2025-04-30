import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { BlurFade } from "@/components/magicui/blur-fade"
import { ShineBorder } from "@/components/magicui/shine-border"
import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { SparklesText } from "@/components/magicui/sparkles-text"

export default function CTA() {
  return (
    <section className="py-24 bg-primary/10 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl -z-10" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <BlurFade className="max-w-4xl mx-auto">
          <ShineBorder 
            className="rounded-2xl p-12 bg-background/30 backdrop-blur-sm text-center"
            color="rgba(var(--primary), 0.8)"
            borderWidth={2}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              Ready to <SparklesText text="Transform Your Mind" />?
            </h2>
            <p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
              Join POSITIVE-Next today and start your journey to mental fitness and emotional intelligence.
            </p>
            <ShimmerButton className="w-full sm:w-auto">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center px-8 py-4 rounded-md text-lg font-medium"
              >
                Get Started Now
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Link>
            </ShimmerButton>
          </ShineBorder>
        </BlurFade>
      </div>
    </section>
  )
}

