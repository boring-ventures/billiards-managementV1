'use client';

import { useEffect, useState } from 'react';
import { debugCookies } from '@/lib/supabase/client';
import { supabase } from '@/lib/supabase/client';

/**
 * Component for debugging cookies and authentication state
 * This is for development use only
 */
export function CookieDebugger() {
  const [cookies, setCookies] = useState<Record<string, string>>({});
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check cookies on mount and periodically
  useEffect(() => {
    const checkCookiesAndSession = async () => {
      try {
        // Get all cookies
        const cookieData = debugCookies() || {};
        setCookies(cookieData);
        
        // Check session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Debug] Session error:', error.message);
          setError(error.message);
        } else {
          setSessionInfo({
            hasSession: !!data.session,
            accessToken: data.session?.access_token ? '✓ Present' : '❌ Missing',
            refreshToken: data.session?.refresh_token ? '✓ Present' : '❌ Missing',
            userId: data.session?.user?.id || 'None',
            expiresAt: data.session?.expires_at 
              ? new Date(data.session.expires_at * 1000).toLocaleString()
              : 'N/A'
          });
          setError(null);
        }
      } catch (err) {
        console.error('[Debug] Error:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    // Check immediately
    checkCookiesAndSession();
    
    // Then check every 5 seconds
    const interval = setInterval(checkCookiesAndSession, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Manually fetch debug info from API
  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/auth/debug');
      const data = await response.json();
      console.log('[Debug] Server debug info:', data);
      alert('Debug info logged to console.');
    } catch (err) {
      console.error('[Debug] API error:', err);
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Manually trigger a session refresh
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('[Debug] Refresh error:', error.message);
        alert(`Failed to refresh: ${error.message}`);
      } else {
        console.log('[Debug] Session refreshed:', !!data.session);
        alert(`Session ${data.session ? 'refreshed successfully' : 'could not be refreshed'}`);
      }
    } catch (err) {
      console.error('[Debug] Refresh error:', err);
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      maxWidth: '400px',
      fontSize: '12px'
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>🍪 Auth Debugger</h3>
      
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : (
        <>
          <div style={{ marginBottom: '10px' }}>
            <h4 style={{ margin: '0 0 5px 0' }}>Session Status</h4>
            <ul style={{ margin: '0', padding: '0 0 0 20px' }}>
              {sessionInfo && Object.entries(sessionInfo).map(([key, value]) => (
                <li key={key}>{key}: {value as string}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 5px 0' }}>Cookies ({Object.keys(cookies).length})</h4>
            <ul style={{ margin: '0', padding: '0 0 0 20px' }}>
              {Object.keys(cookies).map(name => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        </>
      )}
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        <button onClick={fetchDebugInfo} style={{ padding: '4px 8px' }}>
          Fetch Debug Info
        </button>
        <button onClick={refreshSession} style={{ padding: '4px 8px' }}>
          Refresh Session
        </button>
      </div>
    </div>
  );
} 