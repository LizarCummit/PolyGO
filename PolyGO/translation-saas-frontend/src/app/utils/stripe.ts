import { Stripe, loadStripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

export const STRIPE_PRICE_IDS = {
  PRO: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  ENTERPRISE: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
}; 