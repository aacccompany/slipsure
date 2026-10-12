import { redirect } from 'next/navigation';

export default function MerchantSubscriptionRedirect() {
  redirect('/dashboard/subscription');
}
