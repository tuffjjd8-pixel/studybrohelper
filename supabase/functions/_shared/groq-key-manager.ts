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

// All available Groq API key environment variable names (0-7 primary, BACKUP as final fallback)
const GROQ_KEY_NAMES = [
  "GROQ_API_KEY_0",
  "GROQ_API_KEY_1",
  "GROQ_API_KEY_2",
  "GROQ_API_KEY_3",
  "GROQ_API_KEY_4",
  "GROQ_API_KEY_5",
  "GROQ_API_KEY_6",
  "GROQ_API_KEY_7",
  "GROQ_API_KEY_BACKUP", // Final fallback
];

// Constants
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown after rate limit
const FAIL_COUNT_THRESHOLD = 3;
const FAIL_WINDOW_MS = 60 * 60 * 1000; // 1 hour window for fail count

// Get all available keys from environment with their names for logging
function getAvailableKeysWithNames(): Array<{ name: string; key: string }> {
  const keys: Array<{ name: string; key: string }> = [];
  for (const keyName of GROQ_KEY_NAMES) {
    const key = Deno.env.get(keyName);
    if (key && key.trim()) {
      keys.push({ name: keyName, key });
    }
  }
  return keys;
}

// Get all available keys from environment
function getAvailableKeys(): string[] {
  return getAvailableKeysWithNames().map(k => k.key);
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
  const keysWithNames = getAvailableKeysWithNames();
  const keys = keysWithNames.map(k => k.key);
  
  if (keys.length === 0) {
    console.error("[GroqKeyManager] No API keys configured!");
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
    
    const keyName = keysWithNames.find(k => k.key === oldestKey)?.name || "unknown";
    console.log(`[GroqKeyManager] All keys limited, falling back to oldest: ${keyName} (${getMaskedKey(oldestKey)})`);
    return oldestKey;
  }

  // Sort by lastUsed (ascending) to get least recently used
  usableKeys.sort((a, b) => {
    const usageA = keyUsage.get(a)!;
    const usageB = keyUsage.get(b)!;
    return usageA.lastUsed - usageB.lastUsed;
  });

  const selectedKey = usableKeys[0];
  const keyName = keysWithNames.find(k => k.key === selectedKey)?.name || "unknown";
  console.log(`[GroqKeyManager] Selected key: ${keyName} (${getMaskedKey(selectedKey)}) from ${usableKeys.length}/${keys.length} usable keys`);
  
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

// Helper to call Groq with automatic key rotation (uses all keys before giving up)
export async function callGroqWithRotation(
  endpoint: string,
  body: Record<string, unknown>,
  maxRetries: number = 9 // Try all 9 keys (0-7 + backup)
): Promise<Response> {
  let lastError: Error | null = null;
  const keysWithNames = getAvailableKeysWithNames();
  const totalKeys = keysWithNames.length;
  
  console.log(`[GroqKeyManager] Starting request with ${totalKeys} available keys`);
  
  for (let attempt = 0; attempt < Math.min(maxRetries, totalKeys); attempt++) {
    const apiKey = getActiveKey();
    
    if (!apiKey) {
      console.error("[GroqKeyManager] No usable API keys available");
      throw new Error("All Groq keys are currently rate-limited. Please try again shortly.");
    }
    
    const keyName = keysWithNames.find(k => k.key === apiKey)?.name || "unknown";
    
    try {
      console.log(`[GroqKeyManager] Attempt ${attempt + 1}/${totalKeys} using ${keyName}`);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        console.log(`[GroqKeyManager] Success with ${keyName}`);
        markKeyUsed(apiKey);
        return response;
      }
      
      if (response.status === 429) {
        console.log(`[GroqKeyManager] Rate limit hit on ${keyName}, rotating to next key...`);
        markKeyRateLimited(apiKey);
        continue; // Try next key
      }
      
      if (response.status === 401 || response.status === 403) {
        console.log(`[GroqKeyManager] Auth error on ${keyName}: ${response.status}, rotating...`);
        markKeyFailed(apiKey, `Auth error ${response.status}`);
        continue; // Try next key for auth errors too
      }
      
      // Other error - mark as failed and try next key
      const errorText = await response.text();
      console.error(`[GroqKeyManager] Error on ${keyName}: HTTP ${response.status} - ${errorText.substring(0, 200)}`);
      markKeyFailed(apiKey, `HTTP ${response.status}`);
      lastError = new Error(`Groq API error: ${response.status} - ${errorText}`);
      continue; // Try next key for other errors
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[GroqKeyManager] Network/timeout error on ${keyName}:`, lastError.message);
      markKeyFailed(apiKey, lastError.message);
      continue; // Try next key for network errors
    }
  }
  
  // All keys failed
  const backupKey = Deno.env.get("GROQ_API_KEY_BACKUP");
  if (backupKey) {
    console.log("[GroqKeyManager] All primary keys failed, trying BACKUP as final fallback...");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${backupKey}`,
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        console.log("[GroqKeyManager] BACKUP key succeeded");
        return response;
      }
      
      const errorText = await response.text();
      console.error(`[GroqKeyManager] BACKUP key also failed: ${response.status} - ${errorText.substring(0, 200)}`);
    } catch (error) {
      console.error("[GroqKeyManager] BACKUP key network error:", error);
    }
  }
  
  console.error("[GroqKeyManager] All keys exhausted, request failed");
  throw lastError || new Error("All Groq keys are currently rate-limited. Please try again shortly.");
}
