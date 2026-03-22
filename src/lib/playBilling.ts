// Google Play Billing – pure web stub
// No native imports; real billing is handled after Capacitor export in Android Studio

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
  isAvailable(): boolean {
    return false;
  }

  async queryProducts(_productIds: string[]): Promise<PlayBillingProduct[]> {
    console.log('[PlayBilling] Web stub – queryProducts not available');
    return [];
  }

  async purchaseSubscription(_productId: string): Promise<PlayBillingPurchase | null> {
    console.log('[PlayBilling] Web stub – purchaseSubscription not available');
    return null;
  }

  async queryPurchases(): Promise<PlayBillingPurchase[]> {
    console.log('[PlayBilling] Web stub – queryPurchases not available');
    return [];
  }
}

export const playBillingService = new PlayBillingService();
