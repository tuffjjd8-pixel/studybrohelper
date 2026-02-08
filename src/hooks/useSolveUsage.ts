import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const FREE_SOLVES_PER_DAY = 5;

function getDeviceId(): string {
  let deviceId = localStorage.getItem("studybro_device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("studybro_device_id", deviceId);
  }
  return deviceId;
}

interface SolveUsageState {
  solvesUsed: number;
  solvesRemaining: number;
  maxSolves: number;
  canSolve: boolean;
  isPremium: boolean;
  loading: boolean;
}

// Client-side cache to avoid redundant network calls
const usageCache: { data: SolveUsageState | null; ts: number; key: string } = {
  data: null,
  ts: 0,
  key: "",
};
const CACHE_TTL = 20_000; // 20 seconds

export function useSolveUsage(userId: string | undefined, isPremium: boolean) {
  const [state, setState] = useState<SolveUsageState>(() => {
    if (isPremium) {
      return {
        solvesUsed: 0,
        solvesRemaining: -1,
        maxSolves: FREE_SOLVES_PER_DAY,
        canSolve: true,
        isPremium: true,
        loading: false,
      };
    }
    // Check client cache for instant hydration
    const deviceId = getDeviceId();
    const cacheKey = userId || deviceId;
    if (usageCache.key === cacheKey && Date.now() - usageCache.ts < CACHE_TTL && usageCache.data) {
      return usageCache.data;
    }
    return {
      solvesUsed: 0,
      solvesRemaining: FREE_SOLVES_PER_DAY,
      maxSolves: FREE_SOLVES_PER_DAY,
      canSolve: true,
      isPremium: false,
      loading: true,
    };
  });

  const deviceId = getDeviceId();
  const cacheKey = userId || deviceId;

  // Initial check on mount — single "check" call, cached for 20s
  const checkUsage = useCallback(async () => {
    if (isPremium) {
      setState({
        solvesUsed: 0,
        solvesRemaining: -1,
        maxSolves: FREE_SOLVES_PER_DAY,
        canSolve: true,
        isPremium: true,
        loading: false,
      });
      return;
    }

    // Check client-side cache
    if (usageCache.key === cacheKey && Date.now() - usageCache.ts < CACHE_TTL && usageCache.data) {
      setState(usageCache.data);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-solve-usage", {
        body: {
          action: "check",
          userId: userId || null,
          deviceId: userId ? null : deviceId,
        },
      });

      if (error) {
        console.error("Failed to check solve usage:", error);
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      const newState: SolveUsageState = {
        solvesUsed: data.solvesUsed ?? 0,
        solvesRemaining: data.solvesRemaining ?? FREE_SOLVES_PER_DAY,
        maxSolves: data.maxSolves ?? FREE_SOLVES_PER_DAY,
        canSolve: data.canSolve ?? true,
        isPremium: data.isPremium ?? false,
        loading: false,
      };
      setState(newState);
      usageCache.data = newState;
      usageCache.ts = Date.now();
      usageCache.key = cacheKey;
    } catch (e) {
      console.error("Check solve usage error:", e);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [userId, deviceId, isPremium, cacheKey]);

  // Atomic check_and_use: single call that checks limits AND deducts in one round-trip
  const useSolve = useCallback(async (): Promise<boolean> => {
    if (isPremium) return true;

    try {
      const { data, error } = await supabase.functions.invoke("check-solve-usage", {
        body: {
          action: "check_and_use",
          userId: userId || null,
          deviceId: userId ? null : deviceId,
        },
      });

      if (error) {
        console.error("Failed to use solve:", error);
        return false;
      }

      if (data.success) {
        const newState: SolveUsageState = {
          solvesUsed: data.solvesUsed ?? 0,
          solvesRemaining: data.solvesRemaining ?? 0,
          maxSolves: data.maxSolves ?? FREE_SOLVES_PER_DAY,
          canSolve: data.canSolve ?? false,
          isPremium: data.isPremium ?? false,
          loading: false,
        };
        setState(newState);
        usageCache.data = newState;
        usageCache.ts = Date.now();
        usageCache.key = cacheKey;
        return true;
      }

      setState((prev) => ({
        ...prev,
        canSolve: false,
        solvesRemaining: 0,
        loading: false,
      }));
      return false;
    } catch (e) {
      console.error("Use solve error:", e);
      return false;
    }
  }, [userId, deviceId, isPremium, cacheKey]);

  useEffect(() => {
    checkUsage();
  }, [checkUsage]);

  return { ...state, useSolve, refreshUsage: checkUsage, deviceId };
}
