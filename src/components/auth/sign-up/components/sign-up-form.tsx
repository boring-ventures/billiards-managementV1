"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FacebookIcon, GithubIcon, UploadCloud } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
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
import { PasswordStrengthIndicator } from "@/components/utils/password-strength-indicator";
import type { SignUpFormProps, SignUpFormData } from "@/types/auth/sign-up";
import { signUpFormSchema } from "@/types/auth/sign-up";
import { toast } from "@/components/ui/use-toast";
import Image from "next/image";
import { uploadAvatar } from "@/lib/supabase/upload-avatar";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export function SignUpForm({ className, ...props }: SignUpFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const router = useRouter();

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    form.setValue("password", e.target.value);
  };

  async function onSubmit(data: SignUpFormData) {
    try {
      setIsLoading(true);

      const { success, user, session, confirmEmail, error } = await signUp(
        data.email,
        data.password
      );

      if (!success || error) {
        throw error || new Error("Failed to sign up");
      }

      if (user) {
        let avatarUrl = null;
        if (avatarFile) {
          try {
            avatarUrl = await uploadAvatar(avatarFile, user.id);
          } catch (error) {
            console.error("Avatar upload failed:", error);
            toast({
              title: "Warning",
              description:
                "Failed to upload avatar, you can add it later from your profile.",
              variant: "default",
            });
          }
        }

        // Add name data to user metadata for later profile creation
        try {
          await supabase.auth.updateUser({
            data: {
              firstName: data.firstName,
              lastName: data.lastName,
            },
          });
        } catch (metadataError) {
          console.error("Failed to update user metadata:", metadataError);
        }

        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            firstName: data.firstName,
            lastName: data.lastName,
            avatarUrl,
          }),
        });

        let result: Record<string, unknown>;
        let text = ""; // Define text outside the try block

        try {
          text = await response.text(); // Assign value inside try
          result = text ? JSON.parse(text) : {};

          if (!response.ok) {
            console.error("Profile creation error:", {
              status: response.status,
              statusText: response.statusText,
              result,
            });

            throw new Error(
              typeof result.error === "string"
                ? result.error
                : `Server responded with status ${response.status}`
            );
          }
        } catch (parseError) {
          console.error(
            "Response parsing error:",
            parseError,
            "Response text:",
            text
          );
          throw new Error("Invalid server response");
        }

        toast({
          title: "Success",
          description:
            "Your account has been created! Please verify your email to continue.",
        });

        // Redirect to verification page instead of dashboard if email confirmation is required
        if (confirmEmail) {
          router.push("/verify-email");
        } else if (session) {
          router.push("/dashboard");
        }
      }
    } catch (error) {
      console.error("Sign up error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-24 w-24">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar preview"
                  fill
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <Input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="w-full max-w-xs"
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="********"
                    {...field}
                    onChange={handlePasswordChange}
                  />
                </FormControl>
                <PasswordStrengthIndicator password={password} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <PasswordInput placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button className="w-full" disabled={isLoading}>
            Create Account
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="w-full"
          type="button"
          disabled={isLoading}
        >
          <GithubIcon className="h-4 w-4" /> GitHub
        </Button>
        <Button
          variant="outline"
          className="w-full"
          type="button"
          disabled={isLoading}
        >
          <FacebookIcon className="h-4 w-4" /> Facebook
        </Button>
      </div>
    </div>
  );
}
