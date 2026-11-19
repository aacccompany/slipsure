import { api } from '@/lib/api-client';

export const LINE_ONBOARDING_URL = '/dashboard/merchant/line?onboarding=1';

export const lineOnboardingStepKey = (merchantId: string) => `line-onboarding-step:${merchantId}`;
export const lineOnboardingCompleteKey = (merchantId: string) => `line-onboarding-complete:${merchantId}`;

export async function getPostLoginDestination(role: string): Promise<string> {
  if (role === 'admin') return '/admin?tab=analytics';

  try {
    const response = await api.getLINEWebhookConfig();
    return response.data?.config?.is_configured ? '/dashboard' : LINE_ONBOARDING_URL;
  } catch {
    // A temporary API failure must not block sign-in.
    return '/dashboard';
  }
}
