import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import SubscriptionButton from '../components/SubscriptionButton';

const plans = [
  {
    name: 'free',
    title: 'Free',
    price: '$0',
    features: [
      '10 transcriptions per month',
      'Basic analytics',
      'Email support',
      '1 user'
    ],
  },
  {
    name: 'pro',
    title: 'Pro',
    price: '$29',
    features: [
      '100 transcriptions per month',
      'Advanced analytics',
      'Priority support',
      'Up to 5 users',
      'Custom branding'
    ],
  },
  {
    name: 'enterprise',
    title: 'Enterprise',
    price: '$99',
    features: [
      'Unlimited transcriptions',
      'Enterprise analytics',
      '24/7 support',
      'Unlimited users',
      'Custom branding',
      'API access',
      'Custom integrations'
    ],
  },
];

export default async function SubscriptionPage() {
  const supabase = createServerComponentClient({ cookies });
  
  // Get the current user and their subscription status
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from('users')
    .select('subscription_plan')
    .eq('id', user?.id)
    .single();

  const currentPlan = userData?.subscription_plan || 'free';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose your plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Simple, transparent pricing that grows with you
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3 lg:gap-x-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="relative bg-white rounded-2xl shadow-lg p-8"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900">
                  {plan.title}
                </h3>
                <p className="mt-4 text-5xl font-extrabold text-gray-900">
                  {plan.price}
                  <span className="text-xl font-medium text-gray-500">
                    /month
                  </span>
                </p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <SubscriptionButton
                planName={plan.name as 'free' | 'pro' | 'enterprise'}
                isCurrentPlan={currentPlan === plan.name}
                disabled={!user || plan.name === 'free'}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 