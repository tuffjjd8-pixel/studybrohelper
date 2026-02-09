import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";
const CACHE_KEY = "feature_flags_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface FeatureFlag {
  feature_name: string;
  enabled_for_all: boolean;
  enabled_for_admin: boolean;
}

interface CachedFlags {
  flags: FeatureFlag[];
  timestamp: number;
}

export function useFeatureFlags(userEmail?: string) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = userEmail === ADMIN_EMAIL;

  const fetchFlags = useCallback(async (skipCache = false) => {
    // Check cache first
    if (!skipCache) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: CachedFlags = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            setFlags(parsed.flags);
            setLoading(false);
            return;
          }
        }
      } catch {}
    }

    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("feature_name, enabled_for_all, enabled_for_admin");

      if (error) throw error;
      if (data) {
        setFlags(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ flags: data, timestamp: Date.now() }));
      }
    } catch (err) {
      console.error("Error fetching feature flags:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const isFeatureEnabled = useCallback(
    (featureName: string): boolean => {
      const flag = flags.find((f) => f.feature_name === featureName);
      if (!flag) return false;
      if (isAdmin) return flag.enabled_for_admin;
      return flag.enabled_for_all;
    },
    [flags, isAdmin]
  );

  const refreshFlags = useCallback(() => fetchFlags(true), [fetchFlags]);

  return { isFeatureEnabled, loading, isAdmin, flags, refreshFlags };
}
