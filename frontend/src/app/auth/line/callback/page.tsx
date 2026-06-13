'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

function LineCallbackContent() {
  const searchParams = useSearchParams();
  const { lineLogin, connectLine, isAuthenticated } = useAuth();
  const [error, setError] = React.useState('');
  const handledRef = React.useRef(false);

  React.useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const lineError = searchParams.get('error_description') || searchParams.get('error');

    if (lineError) {
      setError(lineError);
      return;
    }

    if (!code || !state || handledRef.current) {
      if (!code) {
        setError('Missing LINE authorization code');
      }
      return;
    }

    if (state !== 'login' && state !== 'connect') {
      setError('Invalid LINE authorization state');
      return;
    }

    if (state === 'connect' && !isAuthenticated) {
      setError('Please sign in before connecting LINE');
      return;
    }

    handledRef.current = true;
    const redirectUri = process.env.NEXT_PUBLIC_LINE_LOGIN_CALLBACK_URL || `${window.location.origin}/auth/line/callback`;
    const authAction = state === 'connect' ? connectLine : lineLogin;

    authAction(code, redirectUri).catch((err) => {
      setError(err instanceof Error ? err.message : 'LINE login failed');
    });
  }, [connectLine, isAuthenticated, lineLogin, searchParams]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-2xl p-8 text-center">
        {error ? (
          <>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">LINE Login Failed</h1>
            <p className="mt-3 text-sm text-zinc-500">{error}</p>
            <a
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center bg-blue-800 px-4 py-3 text-sm font-medium text-white hover:bg-blue-900 transition-colors"
            >
              Back to Login
            </a>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-400" />
            <h1 className="mt-5 text-xl font-black text-zinc-900 tracking-tight">Connecting LINE</h1>
            <p className="mt-2 text-sm text-zinc-500">Please wait while we finish LINE authorization.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function LineCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    }>
      <LineCallbackContent />
    </Suspense>
  );
}
