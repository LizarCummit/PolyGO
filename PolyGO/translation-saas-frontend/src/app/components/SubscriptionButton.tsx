'use client';

import { useState } from 'react';
import { getStripe } from '../utils/stripe';
import { STRIPE_PRICE_IDS } from '../utils/stripe';

interface SubscriptionButtonProps {
  planName: 'free' | 'pro' | 'enterprise';
  isCurrentPlan?: boolean;
  disabled?: boolean;
}

export default function SubscriptionButton({
  planName,
  isCurrentPlan = false,
  disabled = false
}: SubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscription = async () => {
    try {
      setIsLoading(true);

      // Get the price ID based on the plan name
      const priceId = STRIPE_PRICE_IDS[planName];
      if (!priceId) {
        throw new Error('Invalid plan selected');
      }

      // Create a checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          planName,
        }),
      });

      const { sessionId, error } = await response.json();
      if (error) throw new Error(error);

      // Redirect to Stripe checkout
      const stripe = await getStripe();
      const { error: stripeError } = await stripe!.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleSubscription}
      disabled={isLoading || disabled || isCurrentPlan}
      className={`px-4 py-2 rounded-md font-medium transition-colors
        ${isCurrentPlan
          ? 'bg-green-100 text-green-800 cursor-default'
          : disabled
          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
    >
      {isLoading ? (
        <span>Loading...</span>
      ) : isCurrentPlan ? (
        'Current Plan'
      ) : (
        `Subscribe to ${planName.charAt(0).toUpperCase() + planName.slice(1)}`
      )}
    </button>
  );
} 