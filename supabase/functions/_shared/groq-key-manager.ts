// ============================================================
// GROQ API KEY ROTATION MANAGER
// Handles multiple API keys with fallback rotation, rate limit tracking,
// and least-recently-used selection
// ============================================================

interface KeyUsage {
  tokensUsed: number;
  lastUsed: number;
  rateLimitHit: boolean;
  failCount: number;
  lastFailTime: number;
}

interface KeySwitchLog {
  timestamp: number;
  fromKey: string;
  toKey: string;
  reason: string;
}

// In-memory state for key tracking (resets per cold start, but sufficient for rotation)
const keyUsage: Map<string, KeyUsage> = new Map();
const switchLog: KeySwitchLog[] = [];

// All available Groq API key environment variable names
const GROQ_KEY_NAMES = [
  "GROQ_API_KEY",
  "GROQ_API_KEY_1",
  "GROQ_API_KEY_2",
  "GROQ_API_KEY_3",
  "GROQ_API_KEY_4",
  "GROQ_API_KEY_5",
  "GROQ_API_KEY_6",
  "GROQ_API_KEY_BACKUP",
];

// Constants
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown after rate limit
const FAIL_COUNT_THRESHOLD = 3;
const FAIL_WINDOW_MS = 60 * 60 * 1000; // 1 hour window for fail count

// Get all available keys from environment
function getAvailableKeys(): string[] {
  const keys: string[] = [];
  for (const keyName of GROQ_KEY_NAMES) {
    const key = Deno.env.get(keyName);
    if (key && key.trim()) {
      keys.push(key);
    }
  }
  return keys;
}

// Initialize usage tracking for a key if not exists
function initKeyUsage(key: string): void {
  if (!keyUsage.has(key)) {
    keyUsage.set(key, {
      tokensUsed: 0,
      lastUsed: 0,
      rateLimitHit: false,
      failCount: 0,
      lastFailTime: 0,
    });
  }
}

// Check if a key is currently usable
function isKeyUsable(key: string): boolean {
  const usage = keyUsage.get(key);
  if (!usage) return true;

  const now = Date.now();

  // Check if rate limit cooldown has passed
  if (usage.rateLimitHit && now - usage.lastUsed < RATE_LIMIT_COOLDOWN_MS) {
    return false;
  }

  // Reset rate limit flag if cooldown passed
  if (usage.rateLimitHit && now - usage.lastUsed >= RATE_LIMIT_COOLDOWN_MS) {
    usage.rateLimitHit = false;
  }

  // Check if too many recent failures
  if (usage.failCount >= FAIL_COUNT_THRESHOLD) {
    if (now - usage.lastFailTime < FAIL_WINDOW_MS) {
      return false;
    }
    // Reset fail count if window passed
    usage.failCount = 0;
  }

  return true;
}

// Get the best available key (least recently used that's usable)
export function getActiveKey(): string | null {
  const keys = getAvailableKeys();
  
  if (keys.length === 0) {
    return null;
  }

  // Initialize all keys
  keys.forEach(initKeyUsage);

  // Filter to usable keys
  const usableKeys = keys.filter(isKeyUsable);

  if (usableKeys.length === 0) {
    // All keys are rate-limited or failed too many times
    // Return the one with oldest rate limit (might be ready soon)
    let oldestKey = keys[0];
    let oldestTime = Infinity;
    
    for (const key of keys) {
      const usage = keyUsage.get(key);
      if (usage && usage.lastUsed < oldestTime) {
        oldestTime = usage.lastUsed;
        oldestKey = key;
      }
    }
    
    console.log("[GroqKeyManager] All keys limited, falling back to oldest:", getMaskedKey(oldestKey));
    return oldestKey;
  }

  // Sort by lastUsed (ascending) to get least recently used
  usableKeys.sort((a, b) => {
    const usageA = keyUsage.get(a)!;
    const usageB = keyUsage.get(b)!;
    return usageA.lastUsed - usageB.lastUsed;
  });

  const selectedKey = usableKeys[0];
  console.log("[GroqKeyManager] Selected key:", getMaskedKey(selectedKey), "from", usableKeys.length, "usable keys");
  
  return selectedKey;
}

// Mark key as used successfully
export function markKeyUsed(key: string, tokensUsed: number = 0): void {
  initKeyUsage(key);
  const usage = keyUsage.get(key)!;
  usage.lastUsed = Date.now();
  usage.tokensUsed += tokensUsed;
  usage.rateLimitHit = false;
  // Decay fail count on success
  if (usage.failCount > 0) {
    usage.failCount = Math.max(0, usage.failCount - 1);
  }
}

// Mark key as rate limited
export function markKeyRateLimited(key: string, previousKey?: string): void {
  initKeyUsage(key);
  const usage = keyUsage.get(key)!;
  usage.rateLimitHit = true;
  usage.lastUsed = Date.now();
  usage.failCount++;
  usage.lastFailTime = Date.now();

  // Log the switch
  const nextKey = getActiveKey();
  if (nextKey && nextKey !== key) {
    logSwitch(key, nextKey, "rate_limit");
  }
  
  console.log("[GroqKeyManager] Key rate limited:", getMaskedKey(key));
}

// Mark key as failed (non-rate-limit error)
export function markKeyFailed(key: string, reason: string): void {
  initKeyUsage(key);
  const usage = keyUsage.get(key)!;
  usage.failCount++;
  usage.lastFailTime = Date.now();
  
  console.log("[GroqKeyManager] Key failed:", getMaskedKey(key), "reason:", reason);
}

// Log a key switch
function logSwitch(fromKey: string, toKey: string, reason: string): void {
  switchLog.push({
    timestamp: Date.now(),
    fromKey: getMaskedKey(fromKey),
    toKey: getMaskedKey(toKey),
    reason,
  });
  
  // Keep only last 100 entries
  while (switchLog.length > 100) {
    switchLog.shift();
  }
  
  console.log("[GroqKeyManager] Switched from", getMaskedKey(fromKey), "to", getMaskedKey(toKey), "reason:", reason);
}

// Get masked version of key for logging (show first/last 4 chars)
function getMaskedKey(key: string): string {
  if (key.length <= 12) return "***";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// Get current status (for admin/debugging)
export function getKeyManagerStatus(): {
  activeKey: string | null;
  totalKeys: number;
  usableKeys: number;
  switchLog: KeySwitchLog[];
} {
  const keys = getAvailableKeys();
  const usableKeys = keys.filter(isKeyUsable);
  
  return {
    activeKey: getMaskedKey(getActiveKey() || "none"),
    totalKeys: keys.length,
    usableKeys: usableKeys.length,
    switchLog: switchLog.slice(-10), // Last 10 switches
  };
}

// Helper to call Groq with automatic key rotation
export async function callGroqWithRotation(
  endpoint: string,
  body: Record<string, unknown>,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getActiveKey();
    
    if (!apiKey) {
      throw new Error("All Groq keys are currently rate-limited. Please try again shortly.");
    }
    
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        markKeyUsed(apiKey);
        return response;
      }
      
      if (response.status === 429) {
        markKeyRateLimited(apiKey);
        console.log(`[GroqKeyManager] Rate limit hit on attempt ${attempt + 1}, rotating...`);
        continue; // Try next key
      }
      
      // Other error - mark as failed but don't immediately retry
      const errorText = await response.text();
      markKeyFailed(apiKey, `HTTP ${response.status}`);
      lastError = new Error(`Groq API error: ${response.status} - ${errorText}`);
      
      // For non-429 errors, don't retry with different key
      throw lastError;
      
    } catch (error) {
      if (error instanceof Error && error.message.includes("Rate limit")) {
        continue; // Already handled above
      }
      lastError = error instanceof Error ? error : new Error(String(error));
      markKeyFailed(apiKey, lastError.message);
      
      // Network errors - might be worth retrying
      if (attempt < maxRetries - 1) {
        console.log(`[GroqKeyManager] Network error on attempt ${attempt + 1}, retrying...`);
        continue;
      }
      throw lastError;
    }
  }
  
  throw lastError || new Error("All Groq keys are currently rate-limited. Please try again shortly.");
}
