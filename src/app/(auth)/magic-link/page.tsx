import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import AuthLayout from "@/components/auth/auth-layout";
import { MagicLinkForm } from "@/components/auth/magic-link/components/magic-link-form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In with Magic Link",
  description: "Sign in without a password",
};

export default function MagicLinkPage() {
  return (
    <AuthLayout>
      <Card className="p-8 border border-slate-700/50 bg-white/95 dark:bg-slate-950/80 backdrop-blur-sm rounded-xl shadow-xl">
        <div className="flex flex-col space-y-3 text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Magic Link</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below to receive a magic link.{" "}
            <Link
              href="/sign-in"
              className="text-primary font-medium hover:underline"
            >
              Back to Sign In
            </Link>
          </p>
        </div>
        <MagicLinkForm />
      </Card>
    </AuthLayout>
  );
}
