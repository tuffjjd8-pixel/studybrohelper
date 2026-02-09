import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "apexwavesstudios@gmail.com";
const CACHE_KEY = "admin_controls_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REFRESH_EVENT = "admin_controls_refresh";

interface AdminControl {
  id: string;
  feature_key: string;
  visible_for_users: boolean;
  visible_for_admin: boolean;
}

interface CachedControls {
  controls: AdminControl[];
  timestamp: number;
}

export function useAdminControls(userEmail?: string) {
  const [controls, setControls] = useState<AdminControl[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = userEmail === ADMIN_EMAIL;

  const fetchControls = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: CachedControls = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            setControls(parsed.controls);
            setLoading(false);
            return;
          }
        }
      } catch {}
    }

    try {
      const { data, error } = await supabase
        .from("admin_controls")
        .select("id, feature_key, visible_for_users, visible_for_admin");

      if (error) throw error;
      if (data) {
        setControls(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ controls: data, timestamp: Date.now() }));
      }
    } catch (err) {
      console.error("Error fetching admin controls:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchControls();
  }, [fetchControls]);

  // Listen for refresh events from AdminControlsPanel
  useEffect(() => {
    const handler = () => fetchControls(true);
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [fetchControls]);

  const isVisible = useCallback(
    (featureKey: string): boolean => {
      const control = controls.find((c) => c.feature_key === featureKey);
      if (!control) return true; // default visible if no control exists
      if (isAdmin) return control.visible_for_admin;
      return control.visible_for_users;
    },
    [controls, isAdmin]
  );

  const refreshControls = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    return fetchControls(true);
  }, [fetchControls]);

  return { isVisible, loading, isAdmin, controls, refreshControls };
}
