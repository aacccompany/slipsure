'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api-client';

export default function DebugAuthPage() {
  const { user, isAuthenticated, login } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<any>({});
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    // Check localStorage directly
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const expiresAt = localStorage.getItem('expires_at');

    setTokenInfo({
      access_token: accessToken ? `${accessToken.substring(0, 20)}...` : null,
      refresh_token: refreshToken ? `${refreshToken.substring(0, 20)}...` : null,
      expires_at: expiresAt,
      is_expired: expiresAt ? parseInt(expiresAt) < Date.now() : null,
    });
  }, [user]);

  const handleTestLogin = async () => {
    try {
      const result = await api.login({ email: 'test@example.com', password: 'wrongpassword' });
      setTestResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestProfile = async () => {
    try {
      const result = await api.getProfile();
      setTestResult(JSON.stringify(result, null, 2));
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Authentication Debug Page</h1>

        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Auth Context State</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Is Authenticated:</span> {isAuthenticated ? 'Yes' : 'No'}
            </div>
            <div>
              <span className="font-medium">Has User:</span> {user ? 'Yes' : 'No'}
            </div>
            {user && (
              <>
                <div>
                  <span className="font-medium">User ID:</span> {user.id}
                </div>
                <div>
                  <span className="font-medium">User Email:</span> {user.email}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">LocalStorage Tokens</h2>
          <div className="space-y-2 text-sm font-mono">
            <div>Access Token: {tokenInfo.access_token || 'NOT FOUND'}</div>
            <div>Refresh Token: {tokenInfo.refresh_token || 'NOT FOUND'}</div>
            <div>Expires At: {tokenInfo.expires_at || 'NOT FOUND'}</div>
            <div>Is Expired: {tokenInfo.is_expired === null ? 'UNKNOWN' : tokenInfo.is_expired ? 'YES' : 'NO'}</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">API Tests</h2>
          <div className="flex gap-4">
            <button
              onClick={handleTestLogin}
              className="px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900"
            >
              Test Login (should fail)
            </button>
            <button
              onClick={handleTestProfile}
              className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
            >
              Test Profile API
            </button>
          </div>
          {testResult && (
            <pre className="bg-zinc-100 p-4 rounded text-xs overflow-auto">
              {testResult}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
