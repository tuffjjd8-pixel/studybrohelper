import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const FREE_SOLVES_PER_DAY = 5;

// Generate or retrieve a persistent device ID
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

export function useSolveUsage(userId: string | undefined, isPremium: boolean) {
  const [state, setState] = useState<SolveUsageState>({
    solvesUsed: 0,
    solvesRemaining: isPremium ? -1 : FREE_SOLVES_PER_DAY,
    maxSolves: FREE_SOLVES_PER_DAY,
    canSolve: true,
    isPremium,
    loading: true,
  });

  const deviceId = getDeviceId();

  const checkUsage = useCallback(async () => {
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
        return;
      }

      setState({
        solvesUsed: data.solvesUsed ?? 0,
        solvesRemaining: data.solvesRemaining ?? FREE_SOLVES_PER_DAY,
        maxSolves: data.maxSolves ?? FREE_SOLVES_PER_DAY,
        canSolve: data.canSolve ?? true,
        isPremium: data.isPremium ?? isPremium,
        loading: false,
      });
    } catch (e) {
      console.error("Check solve usage error:", e);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [userId, deviceId, isPremium]);

  // Deduct 1 solve. Returns true if successful.
  const useSolve = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("check-solve-usage", {
        body: {
          action: "use",
          userId: userId || null,
          deviceId: userId ? null : deviceId,
        },
      });

      if (error) {
        console.error("Failed to use solve:", error);
        return false;
      }

      if (data.success) {
        setState({
          solvesUsed: data.solvesUsed ?? 0,
          solvesRemaining: data.solvesRemaining ?? 0,
          maxSolves: data.maxSolves ?? FREE_SOLVES_PER_DAY,
          canSolve: (data.solvesRemaining ?? 0) > 0 || data.isPremium,
          isPremium: data.isPremium ?? isPremium,
          loading: false,
        });
        return true;
      }

      // Limit reached
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
  }, [userId, deviceId, isPremium]);

  // Check usage on mount and when userId changes
  useEffect(() => {
    checkUsage();
  }, [checkUsage]);

  return { ...state, useSolve, refreshUsage: checkUsage, deviceId };
}
