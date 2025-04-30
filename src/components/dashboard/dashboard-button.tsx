'use client';

import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface DashboardButtonProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export function DashboardButton({
  href,
  icon: Icon,
  title,
  description,
  className,
}: DashboardButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "outline", size: "lg" }),
        "h-auto flex flex-col items-center justify-center gap-2 p-6 text-center group shadow-sm hover:shadow-md transition-all duration-200 bg-card border-border/40 hover:border-primary/20 hover:bg-accent/50",
        className
      )}
    >
      <Icon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
      <div className="space-y-1">
        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
} 