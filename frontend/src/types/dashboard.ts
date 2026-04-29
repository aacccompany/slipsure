export interface UsageStats {
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

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  status: 'active' | 'revoked';
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: 'healthy' | 'unhealthy';
  last_sent: string;
}

export interface VerificationLog {
  id: string;
  timestamp: string;
  amount: number;
  sender_name: string;
  bank_name: string;
  trans_ref: string;
  status: 'success' | 'failed';
}

export interface UserProfile {
  full_name: string;
  email: string;
  company_name: string;
  tax_id?: string;
  plan: string;
}
