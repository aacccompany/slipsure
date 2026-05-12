export interface MerchantProfile {
  id: string;
  name: string;
  shopName: string;
  logoUrl?: string;
  lineToken?: string;
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'suspended';
}

export interface SlipVerificationResult {
  id: string;
  timestamp: string;
  amount: number;
  senderName: string;
  receiverName: string;
  bankName: string;
  status: 'success' | 'failed' | 'pending';
  errorReason?: string;
  imageUrl: string;
}

export interface DashboardStats {
  totalScans: number;
  successRate: number;
  remainingQuota: number;
  usageChartData: { date: string; count: number }[];
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limit: number;
}
