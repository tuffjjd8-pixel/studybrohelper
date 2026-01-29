// Reliable mobile app detection for App Store and Google Play compliance
// Returns true if running inside a native app (Capacitor/WebView)

export const isMobileApp = (): boolean => {
  // Check for Capacitor native platform
  const capacitor = (window as any).Capacitor;
  const isCapacitorNative = capacitor && typeof capacitor.isNativePlatform === 'function' 
    ? capacitor.isNativePlatform() 
    : !!capacitor;
  
  // Check for Android WebView
  const isAndroidWebView = navigator.userAgent.includes("wv") ||
    (navigator.userAgent.includes("Android") && navigator.userAgent.includes("Version/"));
  
  // Check for iOS WebView (not standalone PWA)
  const isIOSWebView = navigator.userAgent.includes("iPhone") && 
    !(window.navigator as any).standalone &&
    !navigator.userAgent.includes("Safari");
  
  return isCapacitorNative || isAndroidWebView || isIOSWebView;
};

// External premium URL for mobile app compliance
export const MOBILE_PREMIUM_URL = "https://studybrohelper.lovable.app/premium";

// Open premium page appropriately based on platform
export const openPremiumPage = (navigate: (path: string) => void): void => {
  if (isMobileApp()) {
    // Open external browser for mobile apps (App Store + Google Play compliance)
    window.open(MOBILE_PREMIUM_URL, "_system");
  } else {
    // Standard web navigation
    navigate("/premium");
  }
};
