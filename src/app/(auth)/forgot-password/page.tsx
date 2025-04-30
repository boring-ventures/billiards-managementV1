import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import AuthLayout from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password/components/forgot-password-form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <Card className="p-6 border-2 shadow-lg">
        <div className="flex flex-col space-y-2 text-left">
          <h1 className="text-2xl font-semibold tracking-tight">
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below to receive a password reset link.{" "}
            <Link
              href="/sign-in"
              className="underline underline-offset-4 hover:text-primary"
            >
              Back to Sign In
            </Link>
          </p>
        </div>
        <ForgotPasswordForm />
      </Card>
    </AuthLayout>
  );
}
