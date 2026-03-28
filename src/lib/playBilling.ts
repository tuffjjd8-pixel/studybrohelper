// Google Play Billing Service — web stub
// Native Capacitor plugins must not be imported directly in web code.
// This module provides a type-safe interface and no-ops for the web build.
// The real BillingClient logic runs natively on Android via Capacitor plugins.

export interface PlayProduct {
  productId: string;
  basePlanId?: string;
  title: string;
  price: string;
  type: 'subscription' | 'one_time';
}

export const PLAY_PRODUCTS: PlayProduct[] = [
  { productId: 'pro_community_monthly', basePlanId: 'monthly', title: 'Community Monthly', price: '$4.99', type: 'subscription' },
  { productId: 'pro_monthly', basePlanId: 'monthly', title: 'Pro Monthly', price: '$5.99', type: 'subscription' },
  { productId: 'pro_premium_monthly', basePlanId: 'monthly', title: 'Premium Monthly', price: '$7.99', type: 'subscription' },
  { productId: 'pro_weekly', basePlanId: 'weekly', title: 'Weekly', price: '$6.99', type: 'subscription' },
  { productId: 'pro_yearly', basePlanId: 'yearly', title: 'Yearly', price: '$59.99', type: 'subscription' },
  { productId: 'pro_2year', title: '2-Year Pro Access', price: '$84.99', type: 'one_time' },
];

export type PurchaseState = 'idle' | 'purchasing' | 'owned' | 'error';

// Web stubs — these are no-ops outside of a native Android environment
export const PlayBillingService = {
  /** Initialize the BillingClient (no-op on web) */
  async initialize(): Promise<boolean> {
    console.log('[PlayBilling] Web stub: initialize()');
    return false;
  },

  /** Query product details from Google Play (no-op on web) */
  async queryProducts(): Promise<PlayProduct[]> {
    console.log('[PlayBilling] Web stub: queryProducts()');
    return PLAY_PRODUCTS; // Return static catalog for UI rendering
  },

  /** Launch the Google Play purchase flow (no-op on web) */
  async purchase(productId: string, basePlanId?: string): Promise<boolean> {
    console.log(`[PlayBilling] Web stub: purchase(${productId}, ${basePlanId})`);
    return false;
  },

  /** Restore previous purchases (no-op on web) */
  async restorePurchases(): Promise<string[]> {
    console.log('[PlayBilling] Web stub: restorePurchases()');
    return [];
  },

  /** Check if user owns a specific product (no-op on web) */
  async isOwned(productId: string): Promise<boolean> {
    console.log(`[PlayBilling] Web stub: isOwned(${productId})`);
    return false;
  },

  /** Check if user has any active premium entitlement (no-op on web) */
  async hasActiveSubscription(): Promise<boolean> {
    console.log('[PlayBilling] Web stub: hasActiveSubscription()');
    return false;
  },
};
