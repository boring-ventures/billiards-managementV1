import { useEffect, useState, useCallback, createContext, useContext, useMemo } from 'react';
import { createBrowserSupabaseClient, refreshSession } from '@/lib/auth-client-utils';
import type { User, Session } from '@supabase/supabase-js';

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
  error: string | null;
};

type AuthContextType = AuthState & {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  updateProfile: (profile: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  session: null,
  profile: null,
  error: null,
  signIn: async () => ({ success: false, error: 'Auth context not initialized' }),
  signUp: async () => ({ success: false, error: 'Auth context not initialized' }),
  signOut: async () => {},
  refreshAuth: async () => false,
  updateProfile: async () => ({ success: false, error: 'Auth context not initialized' }),
});

// Hook to use the authentication context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    session: null,
    profile: null,
    error: null,
  });

  // Create Supabase client once using the singleton pattern
  // This ensures only one GoTrueClient instance exists throughout the app
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // Fetch profile data
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/profile?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const data = await response.json();
      return data.profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  // Check current auth status
  const checkAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      const session = data.session;
      
      if (session && session.user) {
        const profile = await fetchProfile(session.user.id);
        
        setState({
          isLoading: false,
          isAuthenticated: true,
          user: session.user,
          session,
          profile,
          error: null,
        });
        
        return true;
      } else {
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          session: null,
          profile: null,
          error: null,
        });
        
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
        error: error instanceof Error ? error.message : 'Authentication check failed',
      });
      
      return false;
    }
  }, [fetchProfile, supabase.auth]);

  // Sign in function
  const signIn = async (email: string, password: string) => {
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
  };

  // Sign up function
  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
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
  };

  // Sign out function
  const signOut = async () => {
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
        error: null,
      });
      
      // Redirect to sign-in page (can be handled in UI)
    } catch (error) {
      console.error('Sign out error:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      }));
    }
  };

  // Refresh auth session
  const refreshAuth = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Try refreshing through our API first
      const response = await fetch('/api/auth/refresh', { method: 'POST' });
      
      if (response.ok) {
        // Refresh succeeded, now update state
        await checkAuth();
        return true;
      }
      
      // If API refresh fails, try client-side refresh
      const result = await refreshSession();
      
      if (result.success) {
        // Client-side refresh succeeded, update state
        await checkAuth();
        return true;
      }
      
      // All refresh attempts failed
      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
        error: result.error || 'Session refresh failed',
      }));
      
      return false;
    } catch (error) {
      console.error('Auth refresh error:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Failed to refresh authentication',
      }));
      
      return false;
    }
  };

  // Update profile
  const updateProfile = async (profileData: Partial<Profile>) => {
    try {
      if (!state.user) {
        throw new Error('User must be authenticated to update profile');
      }
      
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
      
      // Update local state with new profile data
      setState(prev => ({
        ...prev,
        isLoading: false,
        profile: data,
      }));
      
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      }));
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update profile'
      };
    }
  };

  // Listen for auth changes
  useEffect(() => {
    // Initial auth check
    checkAuth();
    
    // Set up auth state change listener using the singleton client
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] Auth state changed: ${event}`, session ? 'Session exists' : 'No session');
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          checkAuth();
        } else if (event === 'SIGNED_OUT') {
          setState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            session: null,
            profile: null,
            error: null,
          });
        }
      }
    );
    
    // Cleanup
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [checkAuth, supabase.auth]);

  const value = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshAuth,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
