'use client'

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/utils/password-input";
import type { SignInFormData, UserAuthFormProps } from "@/types/auth/sign-in";
import { signInFormSchema } from "@/types/auth/sign-in";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { storeSessionData } from "@/lib/auth-client-utils";

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: SignInFormData) {
    try {
      setIsLoading(true);
      
      // First, try direct Supabase auth to ensure session cookies are set properly
      const supabaseClient = supabase();
      if (supabaseClient && supabaseClient.auth) {
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
          email: data.email,
          password: data.password
        });
        
        if (authError) {
          throw authError;
        }
        
        // If we have auth data, manually store it
        if (authData && authData.session) {
          console.log("Successful Supabase direct login, storing session data");
          storeSessionData(authData.session);
          
          // Set a flag to indicate we have an active session
          localStorage.setItem('has_session', 'true');
          
          // For debugging
          console.log("Session stored successfully:", {
            hasLocalStorage: !!localStorage.getItem('supabase.auth.token'),
            hasSessionFlag: localStorage.getItem('has_session') === 'true'
          });
        }
      }
      
      // Then also use our custom sign-in implementation as a backup
      await signIn(data.email, data.password);
      
      toast({
        title: "Success",
        description: "You have been signed in.",
      });
      
      // Add a small delay to ensure cookies/storage is set before navigation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Sign-in error:", error);
      toast({
        title: "Error",
        description: "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-muted-foreground hover:opacity-75"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <PasswordInput placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="mt-2" disabled={isLoading}>
              Login
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
