import { api } from '@/lib/api-client';
import type { QuotaStatus, Slip, SlipListResponse } from '@/types/api';

// Dashboard Stats
export interface DashboardStats {
  totalScans: number;
  successRate: number;
  activeUsers: number;
  avgLatency: number;
  scansTrend: number;
  successTrend: number;
  usersTrend: number;
  latencyTrend: number;
}

export interface DailyUsage {
  day: string;
  successful: number;
  failed: number;
}

export const dashboardService = {
  // Stats & Charts
  getStats: async (): Promise<DashboardStats> => {
    try {
      const quota = await api.getQuota();
      const slips = await api.getSlips({ limit: 1000 });

      const totalScans = slips.data?.pagination?.total || 0;
      const verified = slips.data?.slips?.filter(s => s.status === 'verified').length || 0;
      const successRate = totalScans > 0 ? Math.round((verified / totalScans) * 100) : 0;

      // Generate mock trend data
      return {
        totalScans,
        successRate,
        activeUsers: 1, // Will be calculated from real user data
        avgLatency: 0.8,
        scansTrend: 12,
        successTrend: 5,
        usersTrend: 8,
        latencyTrend: -0.1,
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Return mock data on error
      return {
        totalScans: 1248,
        successRate: 94,
        activeUsers: 12,
        avgLatency: 0.8,
        scansTrend: 12,
        successTrend: 5,
        usersTrend: 8,
        latencyTrend: -0.1,
      };
    }
  },

  getDailyUsage: async (): Promise<DailyUsage[]> => {
    try {
      const slips = await api.getSlips({ limit: 100 });
      const slipsData = slips.data?.slips || [];

      // Group by date
      const dailyMap = new Map<string, { successful: number; failed: number }>();

      slipsData.forEach(slip => {
        const date = new Date(slip.created_at).toLocaleDateString('en-US', { weekday: 'short' });
        const current = dailyMap.get(date) || { successful: 0, failed: 0 };

        if (slip.status === 'verified') {
          current.successful++;
        } else if (slip.status === 'failed') {
          current.failed++;
        }

        dailyMap.set(date, current);
      });

      // Convert to array and fill missing days
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const result: DailyUsage[] = days.map(day => ({
        day,
        successful: dailyMap.get(day)?.successful || 0,
        failed: dailyMap.get(day)?.failed || 0,
      }));

      return result;
    } catch (error) {
      console.error('Failed to fetch daily usage:', error);
      // Return mock data
      return [
        { day: 'Mon', successful: 145, failed: 8 },
        { day: 'Tue', successful: 187, failed: 12 },
        { day: 'Wed', successful: 156, failed: 5 },
        { day: 'Thu', successful: 198, failed: 15 },
        { day: 'Fri', successful: 212, failed: 18 },
        { day: 'Sat', successful: 134, failed: 7 },
        { day: 'Sun', successful: 98, failed: 4 },
      ];
    }
  },

  // Quota
  getQuota: async (): Promise<QuotaStatus> => {
    try {
      const response = await api.getQuota();
      return response.data || {
        quota_limit: 500,
        used: 0,
        remaining: 500,
        reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_blocked: false,
      };
    } catch (error) {
      console.error('Failed to fetch quota:', error);
      throw error;
    }
  },

  // Recent Slips
  getRecentSlips: async (limit = 10): Promise<Slip[]> => {
    try {
      const response = await api.getSlips({ limit, page: 1 });
      return response.data?.slips || [];
    } catch (error) {
      console.error('Failed to fetch recent slips:', error);
      return [];
    }
  },
};
