// This is a placeholder implementation for authentication
// In a real application, you would use a proper auth library like NextAuth.js

import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { supabase } from "@/lib/supabase/client";

interface User {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}

interface Session {
  user: User;
  expires: Date;
}

// Get authentication information, prioritizing:
// 1. Supabase authenticated session (if available)
// 2. Find a superadmin in the database as fallback
// 3. Fallback to a dummy user if neither is available
export async function auth(): Promise<Session | null> {
  try {
    // Try to get Supabase auth session
    try {
      const { data } = await supabase.auth.getSession();
      
      if (data.session?.user) {
        return {
          user: {
            id: data.session.user.id,
            email: data.session.user.email || undefined,
            name: data.session.user.user_metadata?.name || undefined,
            role: data.session.user.user_metadata?.role || undefined,
          },
          expires: new Date(data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + 24 * 60 * 60 * 1000),
        };
      }
    } catch (supabaseError) {
      console.error("Error getting Supabase session:", supabaseError);
    }
    
    // If no auth found, try finding a superadmin in the database as fallback
    const superAdmin = await prisma.profile.findFirst({
      where: { role: UserRole.SUPERADMIN },
      select: { userId: true, firstName: true, lastName: true, role: true }
    });
    
    if (superAdmin) {
      return {
        user: {
          id: superAdmin.userId,
          name: superAdmin.firstName ? `${superAdmin.firstName} ${superAdmin.lastName || ''}` : undefined,
          role: superAdmin.role,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }
    
    // Last resort - use fallback ID
    const fallbackId = process.env.NEXT_PUBLIC_DEFAULT_USER_ID || "123e4567-e89b-12d3-a456-426614174000";
    
    return {
      user: {
        id: fallbackId,
        email: "user@example.com",
        name: "Demo User",
        role: "USER",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  } catch (error) {
    console.error("Error in auth function:", error);
    // If anything fails, return fallback user
    const fallbackId = process.env.NEXT_PUBLIC_DEFAULT_USER_ID || "123e4567-e89b-12d3-a456-426614174000";
    
    return {
      user: {
        id: fallbackId,
        email: "user@example.com",
        name: "Demo User",
        role: "USER",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }
}

// Function to get the current user (useful for client components)
export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  return session?.user || null;
}
