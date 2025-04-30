import Link from "next/link";
import { FacebookIcon, TwitterIcon, InstagramIcon, Brain } from "lucide-react";
import { BlurFade } from "@/components/magicui/blur-fade";
import { ShineBorder } from "@/components/magicui/shine-border";

export default function Footer() {
  return (
    <footer className="bg-secondary/30 backdrop-blur-sm text-foreground py-16 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full filter blur-3xl opacity-30 -z-10" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          <BlurFade className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <ShineBorder className="rounded-full p-1">
                <Brain className="h-8 w-8 text-primary" />
              </ShineBorder>
              <span className="text-2xl font-bold text-primary">
                POSITIVE-Next
              </span>
            </div>
            <p className="text-muted-foreground">
              Empowering minds for a better tomorrow.
            </p>
          </BlurFade>
          
          <BlurFade delay={0.1} className="md:col-span-1">
            <h4 className="text-lg font-semibold mb-4 text-foreground/80">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { href: "/#features", label: "Features" },
                { href: "/#about", label: "About" },
                { href: "/#testimonials", label: "Testimonials" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors flex items-center group"
                  >
                    <span className="inline-block w-0 group-hover:w-2 transition-all duration-300 mr-0 group-hover:mr-1 h-px bg-primary"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </BlurFade>
          
          <BlurFade delay={0.2} className="md:col-span-1">
            <h4 className="text-lg font-semibold mb-4 text-foreground/80">Legal</h4>
            <ul className="space-y-3">
              {[
                { href: "/terms", label: "Terms of Service" },
                { href: "/privacy", label: "Privacy Policy" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors flex items-center group"
                  >
                    <span className="inline-block w-0 group-hover:w-2 transition-all duration-300 mr-0 group-hover:mr-1 h-px bg-primary"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </BlurFade>
          
          <BlurFade delay={0.3} className="md:col-span-1">
            <h4 className="text-lg font-semibold mb-4 text-foreground/80">Connect</h4>
            <div className="flex space-x-4">
              {[
                { href: "https://facebook.com/positivenext", icon: FacebookIcon },
                { href: "https://twitter.com/positivenext", icon: TwitterIcon },
                { href: "https://instagram.com/positivenext", icon: InstagramIcon },
              ].map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors p-2 hover:bg-primary/10 rounded-full"
                >
                  <social.icon size={20} />
                </a>
              ))}
            </div>
          </BlurFade>
        </div>
        
        <div className="mt-16 pt-8 border-t border-border/40 text-center">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} POSITIVE-Next. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
