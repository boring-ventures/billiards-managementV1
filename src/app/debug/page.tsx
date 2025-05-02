'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function DebugPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [apiInfo, setApiInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check client-side session
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Client auth error:', error.message);
          setError(error.message);
        } else {
          setSessionInfo({
            hasSession: !!data.session,
            userId: data.session?.user?.id || 'None',
            email: data.session?.user?.email || 'None',
            expiresAt: data.session?.expires_at 
              ? new Date(data.session.expires_at * 1000).toLocaleString()
              : 'N/A'
          });
        }

        // Check server-side auth via API
        const response = await fetch('/api/auth/debug');
        const apiData = await response.json();
        setApiInfo(apiData);

      } catch (err) {
        console.error('Debug error:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Manually trigger a session refresh
  const refreshSession = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        alert(`Failed to refresh: ${error.message}`);
      } else {
        alert(`Session ${data.session ? 'refreshed successfully' : 'could not be refreshed'}`);
        // Update display
        window.location.reload();
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchServerProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();
      alert('Profile fetched - see console');
      console.log('Profile data:', data);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      alert('Signed out. Refreshing...');
      window.location.href = '/sign-in';
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Authentication Debug Page</h1>

      {loading ? (
        <p>Loading authentication information...</p>
      ) : error ? (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">{error}</div>
      ) : (
        <div className="space-y-8">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">Client Session Information</h2>
            <pre className="bg-white p-2 rounded overflow-x-auto">
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          </div>

          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">API Session Information</h2>
            <pre className="bg-white p-2 rounded overflow-x-auto">
              {JSON.stringify(apiInfo, null, 2)}
            </pre>
          </div>

          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">All Cookies</h2>
            <pre className="bg-white p-2 rounded overflow-x-auto">
              {document.cookie.split(';').map(c => c.trim()).join('\n')}
            </pre>
          </div>
          
          <div className="flex space-x-4">
            <button 
              onClick={refreshSession}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={loading}
            >
              Refresh Session
            </button>
            
            <button 
              onClick={fetchServerProfile}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test API Profile
            </button>
            
            <button 
              onClick={signOut}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 