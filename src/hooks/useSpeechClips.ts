import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const FREE_SPEECH_CLIPS = 3;
const SPEECH_RESET_HOURS = 24;

interface SpeechClipStatus {
  clipsRemaining: number;
  maxClips: number;
  hoursUntilReset: number;
  canUseClip: boolean;
  isLoading: boolean;
}

export function useSpeechClips(userId: string | undefined, isPremium: boolean) {
  const [status, setStatus] = useState<SpeechClipStatus>(() => {
    if (isPremium) {
      return {
        clipsRemaining: -1,
        maxClips: -1,
        hoursUntilReset: 0,
        canUseClip: true,
        isLoading: false,
      };
    }
    return {
      clipsRemaining: FREE_SPEECH_CLIPS,
      maxClips: FREE_SPEECH_CLIPS,
      hoursUntilReset: 0,
      canUseClip: true,
      isLoading: true,
    };
  });

  const fetchStatus = useCallback(async () => {
    // Premium users: unlimited, no need to check
    if (isPremium) {
      setStatus({
        clipsRemaining: -1,
        maxClips: -1,
        hoursUntilReset: 0,
        canUseClip: true,
        isLoading: false,
      });
      return;
    }

    if (!userId) {
      setStatus({
        clipsRemaining: FREE_SPEECH_CLIPS,
        maxClips: FREE_SPEECH_CLIPS,
        hoursUntilReset: 0,
        canUseClip: true,
        isLoading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("speech_clips_used, last_speech_reset")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setStatus({
          clipsRemaining: FREE_SPEECH_CLIPS,
          maxClips: FREE_SPEECH_CLIPS,
          hoursUntilReset: 0,
          canUseClip: true,
          isLoading: false,
        });
        return;
      }

      const lastReset = data.last_speech_reset ? new Date(data.last_speech_reset) : null;
      const now = Date.now();
      
      let clipsUsed = data.speech_clips_used || 0;
      let hoursUntilReset = 0;
      
      if (lastReset) {
        const hoursSinceReset = (now - lastReset.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceReset >= SPEECH_RESET_HOURS) {
          clipsUsed = 0;
          await supabase
            .from("profiles")
            .update({ 
              speech_clips_used: 0, 
              last_speech_reset: new Date().toISOString() 
            })
            .eq("user_id", userId);
        } else {
          const resetTime = new Date(lastReset.getTime() + SPEECH_RESET_HOURS * 60 * 60 * 1000);
          hoursUntilReset = Math.max(0, Math.ceil((resetTime.getTime() - now) / (1000 * 60 * 60)));
        }
      }

      const clipsRemaining = Math.max(0, FREE_SPEECH_CLIPS - clipsUsed);
      
      setStatus({
        clipsRemaining,
        maxClips: FREE_SPEECH_CLIPS,
        hoursUntilReset,
        canUseClip: clipsRemaining > 0,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error fetching speech clip status:", error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId, isPremium]);

  const useClip = useCallback(async (): Promise<boolean> => {
    // Premium users: always allowed, no tracking
    if (isPremium) return true;

    if (!userId || !status.canUseClip) return false;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("speech_clips_used, last_speech_reset")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return false;

      const lastReset = data.last_speech_reset ? new Date(data.last_speech_reset) : null;
      const now = Date.now();
      
      let clipsUsed = data.speech_clips_used || 0;
      let needsReset = false;
      
      if (lastReset) {
        const hoursSinceReset = (now - lastReset.getTime()) / (1000 * 60 * 60);
        if (hoursSinceReset >= SPEECH_RESET_HOURS) {
          clipsUsed = 0;
          needsReset = true;
        }
      } else {
        needsReset = true;
      }

      if (clipsUsed >= FREE_SPEECH_CLIPS) {
        return false;
      }

      const newClipsUsed = clipsUsed + 1;
      const updateData: { speech_clips_used: number; last_speech_reset?: string } = {
        speech_clips_used: newClipsUsed,
      };
      
      if (needsReset) {
        updateData.last_speech_reset = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setStatus(prev => ({
        ...prev,
        clipsRemaining: Math.max(0, FREE_SPEECH_CLIPS - newClipsUsed),
        canUseClip: newClipsUsed < FREE_SPEECH_CLIPS,
      }));

      return true;
    } catch (error) {
      console.error("Error using speech clip:", error);
      return false;
    }
  }, [userId, isPremium, status.canUseClip]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    ...status,
    useClip,
    refreshStatus: fetchStatus,
  };
}
