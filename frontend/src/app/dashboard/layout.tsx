'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { DashboardHeader } from '@/components/dashboard/Header';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api-client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [setupChecking, setSetupChecking] = useState(true);
  const [setupBlocked, setSetupBlocked] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && user?.role === 'admin') {
      router.replace('/admin?tab=analytics');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (user.role === 'admin') return;

    let cancelled = false;

    const checkSetup = async () => {
      try {
        const [profileResponse, lineResponse] = await Promise.all([
          api.getMerchantProfile(),
          api.getLINEWebhookConfig(),
        ]);

        const hasProfile = Boolean(profileResponse.data?.profile?.id);
        const hasLineBot = Boolean(lineResponse.data?.config?.is_configured);

        if (!cancelled && (!hasProfile || !hasLineBot)) {
          setSetupBlocked(true);
          router.replace('/onboarding?required=1');
          return;
        }
      } catch {
        if (!cancelled) {
          setSetupBlocked(true);
          router.replace('/onboarding?required=1');
          return;
        }
      } finally {
        if (!cancelled) setSetupChecking(false);
      }
    };

    checkSetup();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  if (authLoading || !user || setupChecking || setupBlocked) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-800 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
