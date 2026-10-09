import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const plans = [
  {
    name: 'Free',
    price: 0,
    features: [
      '60 minutes of transcription/month',
      '100 translations/month',
      'Basic AI analysis',
      'Email support'
    ],
    limits: {
      transcription_minutes: 60,
      translations_per_month: 100,
      storage_gb: 1
    }
  },
  {
    name: 'Pro',
    price: 19.99,
    features: [
      '300 minutes of transcription/month',
      'Unlimited translations',
      'Advanced AI analysis',
      'Priority support',
      'Export to multiple formats',
      '10GB storage'
    ],
    limits: {
      transcription_minutes: 300,
      translations_per_month: -1,
      storage_gb: 10
    }
  },
  {
    name: 'Enterprise',
    price: 49.99,
    features: [
      'Unlimited transcription',
      'Unlimited translations',
      'Custom AI models',
      'Dedicated support',
      'API access',
      'Unlimited storage'
    ],
    limits: {
      transcription_minutes: -1,
      translations_per_month: -1,
      storage_gb: -1
    }
  }
];

export default function Subscription() {
  const [selectedPlan, setSelectedPlan] = useState<string>('Free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planName: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in first');

      // In a real application, you would integrate with Stripe here
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          planName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      // Update user metadata with new subscription
      const plan = plans.find(p => p.name === planName);
      await supabase.auth.updateUser({
        data: {
          subscription_tier: planName,
          usage_limits: plan?.limits
        }
      });

      setSelectedPlan(planName);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose your plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Select the perfect plan for your needs
          </p>
        </div>

        {error && (
          <div className="mt-8 max-w-md mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg shadow-lg divide-y divide-gray-200 ${
                selectedPlan === plan.name ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="p-6">
                <h3 className="text-2xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-4 text-gray-500">
                  {plan.price === 0 ? 'Free' : `$${plan.price}/month`}
                </p>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex">
                      <svg
                        className="flex-shrink-0 w-6 h-6 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="ml-3 text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={loading || selectedPlan === plan.name}
                  className={`mt-8 block w-full py-3 px-6 border border-transparent rounded-md text-center font-medium ${
                    selectedPlan === plan.name
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {selectedPlan === plan.name ? 'Current Plan' : 'Subscribe'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 