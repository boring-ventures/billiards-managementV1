import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/context/theme-context";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { CompanyProvider } from "@/context/company-context";
import { ViewModeProvider } from "@/context/view-mode-context";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Billiards Management System",
  description: "Multi-tenant billiards & POS management application",
  applicationName: "Billiards ERP",
  keywords: ["billiards", "POS", "management", "ERP"],
  creator: "Billiard ERP Systems Inc.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          inter.className,
          "min-h-screen bg-background antialiased",
          "transition-colors duration-300 ease-in-out",
          "group/body"
        )}
      >
        <ThemeProvider
          defaultTheme="system"
          storageKey="app-theme"
        >
          <AuthProvider>
            <CompanyProvider>
              <ViewModeProvider>
                {children}
                <Toaster />
              </ViewModeProvider>
            </CompanyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
