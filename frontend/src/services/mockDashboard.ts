import { 
  UsageStats, 
  DailyUsage, 
  ApiKey, 
  WebhookEndpoint, 
  VerificationLog, 
  UserProfile 
} from '../types/dashboard';

export const mockDashboardData = {
  stats: (): UsageStats => ({
    totalScans: 12482,
    successRate: 99.8,
    activeUsers: 1240,
    avgLatency: 0.82,
    scansTrend: 12.5,
    successTrend: 0.2,
    usersTrend: 5.4,
    latencyTrend: -0.012
  }),

  dailyUsage: (): DailyUsage[] => [
    { day: 'Mon', successful: 450, failed: 5 },
    { day: 'Tue', successful: 600, failed: 12 },
    { day: 'Wed', successful: 850, failed: 8 },
    { day: 'Thu', successful: 400, failed: 20 },
    { day: 'Fri', successful: 950, failed: 15 },
    { day: 'Sat', successful: 700, failed: 4 },
    { day: 'Sun', successful: 800, failed: 10 },
  ],

  keys: (): ApiKey[] => [
    { id: '1', name: 'Production Key', key: 'sk_live_51P2...8x92', created_at: '2024-04-10', status: 'active' },
    { id: '2', name: 'Development Key', key: 'sk_test_51P2...3y45', created_at: '2024-04-15', status: 'active' },
  ],

  webhooks: (): WebhookEndpoint[] => [
    { 
      id: '1', 
      url: 'https://api.yourcommerce.com/webhooks/slipsure', 
      events: ['slip.verified', 'slip.failed'], 
      status: 'healthy',
      last_sent: '2 mins ago'
    },
  ],

  logs: (): VerificationLog[] => [
    { id: '1', timestamp: '2024-04-28 14:30', amount: 1250.00, sender_name: 'Somchai J.', bank_name: 'KBank', trans_ref: 'KB1714282210', status: 'success' },
    { id: '2', timestamp: '2024-04-28 14:15', amount: 500.00, sender_name: 'Jane Doe', bank_name: 'SCB', trans_ref: 'SCB1714281305', status: 'success' },
    { id: '3', timestamp: '2024-04-28 13:50', amount: 2500.00, sender_name: 'Unknown', bank_name: 'N/A', trans_ref: 'N/A', status: 'failed' },
    { id: '4', timestamp: '2024-04-28 13:20', amount: 150.00, sender_name: 'Wichai S.', bank_name: 'TTB', trans_ref: 'TTB1714278010', status: 'success' },
    { id: '5', timestamp: '2024-04-28 12:45', amount: 3000.00, sender_name: 'Malee K.', bank_name: 'BBL', trans_ref: 'BBL1714275902', status: 'success' },
  ],

  profile: (): UserProfile => ({
    full_name: 'Keerati B.',
    email: 'keerati@slipsure.ai',
    company_name: 'Slipsure Co., Ltd.',
    tax_id: '0123456789012',
    plan: 'Developer Plan'
  })
};
