import Link from "next/link";
import { FacebookIcon, TwitterIcon, InstagramIcon, Target, ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative bg-gray-50 text-foreground pt-24 pb-12 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-grid-gray-200/30 -z-10" />
      
      {/* Top curved separator */}
      <div className="absolute top-0 inset-x-0 h-16 bg-white" />
      <div className="absolute -top-8 inset-x-0 h-16 rounded-[50%_50%_0_0] bg-white" />
      
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Brand column */}
          <div className="md:col-span-4 lg:col-span-5">
            <div className="flex items-center mb-5">
              <div className="bg-gradient-to-r from-primary to-blue-600 p-2 rounded-lg mr-2">
                <Target className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                CueMaster
              </span>
            </div>
            
            <p className="text-muted-foreground max-w-md mb-6">
              Streamlining billiards venue management with powerful tools for table booking, POS, inventory tracking, and comprehensive business insights.
            </p>
            
            <div className="flex space-x-4 mb-8 md:mb-0">
              {[
                { href: "https://facebook.com", icon: FacebookIcon },
                { href: "https://twitter.com", icon: TwitterIcon },
                { href: "https://instagram.com", icon: InstagramIcon },
              ].map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-muted-foreground hover:text-primary hover:shadow-md transition-all"
                  aria-label={`${social.icon.name} link`}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>
          
          {/* Navigation columns */}
          <div className="md:col-span-8 lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Quick links */}
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-5">Features</h4>
              <ul className="space-y-3">
                {[
                  { href: "/#features", label: "Table Management" },
                  { href: "/#about", label: "About CueMaster" },
                  { href: "/#testimonials", label: "Success Stories" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Resources */}
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-5">Resources</h4>
              <ul className="space-y-3">
                {[
                  { href: "/blog", label: "Blog" },
                  { href: "/documentation", label: "Documentation" },
                  { href: "/guides", label: "User Guides" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                      <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Legal */}
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-5">Legal</h4>
              <ul className="space-y-3">
                {[
                  { href: "/terms", label: "Terms of Service" },
                  { href: "/privacy", label: "Privacy Policy" },
                  { href: "/cookies", label: "Cookie Policy" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        {/* Bottom section */}
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} CueMaster. All rights reserved.
          </p>
          
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <Link href="/accessibility" className="hover:text-primary transition-colors">
              Accessibility
            </Link>
            <Link href="/sitemap" className="hover:text-primary transition-colors">
              Sitemap
            </Link>
            <span>Trusted by pool halls worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
