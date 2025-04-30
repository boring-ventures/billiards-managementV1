import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import AuthLayout from "@/components/auth/auth-layout";
import { UserAuthForm } from "@/components/auth/sign-in/components/user-auth-form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your account",
};

export default function SignInPage() {
  return (
    <AuthLayout>
      <Card className="p-8 border border-slate-700/50 bg-white/95 dark:bg-slate-950/80 backdrop-blur-sm rounded-xl shadow-xl">
        <div className="flex flex-col space-y-3 text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and password below <br />
            to log into your account.{" "}
            <Link
              href="/sign-up"
              className="text-primary font-medium hover:underline"
            >
              Don&apos;t have an account?
            </Link>
          </p>
        </div>
        <UserAuthForm />
        <div className="mt-4 text-center text-sm">
          <p className="text-muted-foreground">
            Prefer to sign in without a password?{" "}
            <Link
              href="/magic-link"
              className="text-primary font-medium hover:underline"
            >
              Sign in with a magic link
            </Link>
          </p>
        </div>
        <p className="mt-4 px-4 text-center text-sm text-muted-foreground">
          By clicking login, you agree to our{" "}
          <Link
            href="/terms"
            className="text-primary font-medium hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-primary font-medium hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </Card>
    </AuthLayout>
  );
}
