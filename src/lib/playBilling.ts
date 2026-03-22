// Google Play Billing service wrapper for Capacitor
// This provides a web-layer interface to the native Play Billing API

const CAPACITOR = (window as any).Capacitor;

export interface PlayBillingProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
}

export interface PlayBillingPurchase {
  purchaseToken: string;
  productId: string;
  purchaseState: number;
}

class PlayBillingService {
  private isNative: boolean;

  constructor() {
    this.isNative = !!(CAPACITOR && typeof CAPACITOR.isNativePlatform === 'function' && CAPACITOR.isNativePlatform());
  }

  /**
   * Check if Google Play Billing is available (native Android only)
   */
  isAvailable(): boolean {
    return this.isNative;
  }

  /**
   * Query available subscription products from Google Play
   */
  async queryProducts(productIds: string[]): Promise<PlayBillingProduct[]> {
    if (!this.isNative) {
      console.log('[PlayBilling] Not running in native context, returning empty products');
      return [];
    }

    try {
      const { PlayBilling } = await import('@anthropic/capacitor-play-billing' as any).catch(() => ({}));
      if (!PlayBilling) {
        console.warn('[PlayBilling] Plugin not available');
        return [];
      }
      const result = await PlayBilling.queryProducts({ productIds, productType: 'subs' });
      return result.products || [];
    } catch (error) {
      console.error('[PlayBilling] Failed to query products:', error);
      return [];
    }
  }

  /**
   * Launch the Google Play Billing purchase flow
   */
  async purchaseSubscription(productId: string): Promise<PlayBillingPurchase | null> {
    if (!this.isNative) {
      console.log('[PlayBilling] Not running in native context');
      return null;
    }

    try {
      const { PlayBilling } = await import('@anthropic/capacitor-play-billing' as any).catch(() => ({}));
      if (!PlayBilling) {
        console.warn('[PlayBilling] Plugin not available');
        return null;
      }
      const result = await PlayBilling.purchaseSubscription({ productId });
      return result.purchase || null;
    } catch (error) {
      console.error('[PlayBilling] Purchase failed:', error);
      return null;
    }
  }

  /**
   * Query existing purchases (to restore state)
   */
  async queryPurchases(): Promise<PlayBillingPurchase[]> {
    if (!this.isNative) {
      return [];
    }

    try {
      const { PlayBilling } = await import('@anthropic/capacitor-play-billing' as any).catch(() => ({}));
      if (!PlayBilling) return [];
      const result = await PlayBilling.queryPurchases({ productType: 'subs' });
      return result.purchases || [];
    } catch (error) {
      console.error('[PlayBilling] Failed to query purchases:', error);
      return [];
    }
  }
}

export const playBillingService = new PlayBillingService();
