import Stripe from 'stripe';

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  if (!stripe) {
    stripe = new Stripe(key);
  }
  return stripe;
}

export function getStripePublishableKey(): string {
  const key = process.env.STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key) {
    throw new Error('STRIPE_PUBLISHABLE_KEY is not configured');
  }
  return key;
}

/** Convert ZAR amount to Stripe minor units (cents). */
export function toStripeAmount(amount: number): number {
  return Math.round(Number(amount) * 100);
}
