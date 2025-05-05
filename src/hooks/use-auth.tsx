import { useEffect, useState, useCallback, createContext, useContext, useMemo } from 'react';
import { refreshSession } from '@/lib/auth-client-utils';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

// Type definitions for permissions structure (client-side version)
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface SectionPermission {
  view?: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
}

export interface Permissions {
  sections: {
    [sectionKey: string]: SectionPermission;
  };
}

export type Profile = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: string;
  companyId: string | null;
  active: boolean;
}

type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  permissions: Permissions | null;
  error: string | null;
};

type AuthContextType = AuthState & {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  updateProfile: (profile: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  isSuperAdmin: boolean;
  hasPermissionClient: (sectionKey: string, action: PermissionAction) => boolean;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  session: null,
  profile: null,
  permissions: null,
  error: null,
  isSuperAdmin: false,
  signIn: async () => ({ success: false, error: 'Auth context not initialized' }),
  signUp: async () => ({ success: false, error: 'Auth context not initialized' }),
  signOut: async () => {},
  refreshAuth: async () => false,
  updateProfile: async () => ({ success: false, error: 'Auth context not initialized' }),
  hasPermissionClient: () => false,
});

// Hook to use the authentication context
export const useAuth = () => useContext(AuthContext);

// Client-side version of isSuperAdmin function
function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === 'SUPERADMIN';
}

// Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    session: null,
    profile: null,
    permissions: null,
    error: null,
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Create Supabase client once using the singleton pattern
  // This ensures only one GoTrueClient instance exists throughout the app
  const supabase = useMemo(() => {
    try {
      return getSupabaseClient();
    } catch (error) {
      console.error("Failed to initialize Supabase client:", error);
      // Return a placeholder to prevent errors
      return null;
    }
  }, []);

  // Fetch profile data with improved error handling
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // Add a random query parameter to prevent caching
      const cacheBuster = `cacheBuster=${Date.now()}`;
      const response = await fetch(`/api/profile?userId=${userId}&${cacheBuster}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      // Parse JSON response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse profile response:', parseError);
        const text = await response.text();
        console.error('Raw response:', text.substring(0, 500));
        throw new Error('Invalid JSON response from profile API');
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile');
      }
      
      return {
        profile: data.profile,
        permissions: data.permissions || null
      };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return { profile: null, permissions: null };
    }
  }, []);

  // Client-side permission check function
  const hasPermissionClient = useCallback((sectionKey: string, action: PermissionAction): boolean => {
    // Superadmin bypass - always grant access
    if (isSuperAdmin) {
      return true;
    }
    
    // If no permissions or invalid structure, deny access
    if (!state.permissions || !state.permissions.sections) {
      return false;
    }
    
    // Check if section exists in permissions
    const sectionPermissions = state.permissions.sections[sectionKey];
    if (!sectionPermissions) {
      return false;
    }
    
    // Check if action is allowed
    return !!sectionPermissions[action];
  }, [isSuperAdmin, state.permissions]);

  // Check current auth status with improved error handling
  const checkAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      // Try-catch to handle potential errors in getSession
      let sessionData;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        sessionData = data;
      } catch (sessionError) {
        console.error('Session retrieval error:', sessionError);
        throw new Error('Failed to retrieve session');
      }
      
      const session = sessionData.session;
      
      if (session && session.user) {
        try {
          const { profile, permissions } = await fetchProfile(session.user.id);
          
          // Determine if user is a SUPERADMIN
          const superAdminStatus = isSuperAdminRole(profile?.role);
          setIsSuperAdmin(superAdminStatus);
          
          setState({
            isLoading: false,
            isAuthenticated: true,
            user: session.user,
            session,
            profile,
            permissions,
            error: null,
          });
        } catch (profileError) {
          console.error('Profile fetch error during auth check:', profileError);
          setState({
            isLoading: false,
            isAuthenticated: true,
            user: session.user,
            session,
            profile: null,
            permissions: null,
            error: 'Failed to load profile',
          });
        }
        
        return true;
      } else {
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          session: null,
          profile: null,
          permissions: null,
          error: null,
        });
        setIsSuperAdmin(false);
        
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        session: null,
        profile: null,
        permissions: null,
        error: error instanceof Error ? error.message : 'Authentication check failed',
      });
      setIsSuperAdmin(false);
      
      return false;
    }
  }, [fetchProfile, supabase]);

  // Initialize auth state and set up listener
  useEffect(() => {
    // Check auth immediately on mount
    checkAuth();
    
    // Set up auth state change listener if Supabase client is available
    if (supabase) {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
          checkAuth();
        });
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up auth listener:', error);
      }
    }
  }, [checkAuth, supabase]);

  // Construct the context value with all state and functions
  const contextValue = useMemo(() => ({
    ...state,
    isSuperAdmin,
    hasPermissionClient,
    signIn: async (email: string, password: string) => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Sign in failed');
        }
        
        // Refresh auth state after successful sign-in
        await checkAuth();
        
        return { success: true };
      } catch (error) {
        console.error('Sign in error:', error);
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Sign in failed',
        }));
        
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Sign in failed'
        };
      }
    },
    signUp: async (email: string, password: string, firstName?: string, lastName?: string) => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, firstName, lastName }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Sign up failed');
        }
        
        // If sign up auto-signs in, refresh auth state
        if (data.data?.session) {
          await checkAuth();
        }
        
        return { success: true };
      } catch (error) {
        console.error('Sign up error:', error);
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Sign up failed',
        }));
        
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Sign up failed'
        };
      }
    },
    signOut: async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        await fetch('/api/auth/signout', { method: 'POST' });
        
        // Reset auth state
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          session: null,
          profile: null,
          permissions: null,
          error: null,
        });
        setIsSuperAdmin(false);
        
        // Redirect to sign-in page (can be handled in UI)
      } catch (error) {
        console.error('Sign out error:', error);
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Sign out failed',
        }));
      }
    },
    refreshAuth: checkAuth,
    updateProfile: async (profileData: Partial<Profile>) => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));
        
        if (!state.user) {
          throw new Error('User not authenticated');
        }
        
        const response = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update profile');
        }
        
        // Update profile in state
        setState(prev => ({
          ...prev,
          isLoading: false,
          profile: data.profile,
        }));
        
        // Update superadmin status if role changed
        if (profileData.role) {
          setIsSuperAdmin(profileData.role === 'SUPERADMIN');
        }
        
        return { success: true };
      } catch (error) {
        console.error('Profile update error:', error);
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Profile update failed',
        }));
        
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Profile update failed'
        };
      }
    },
  }), [state, isSuperAdmin, hasPermissionClient, checkAuth]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
