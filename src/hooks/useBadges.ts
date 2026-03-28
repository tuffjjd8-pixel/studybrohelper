import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BADGE_DEFINITIONS, BadgeDefinition, getBadgeByKey } from '@/lib/badgeDefinitions';

export interface UserBadge {
  badge_key: string;
  unlocked_at: string;
  progress: number;
}

export interface BadgeWithStatus extends BadgeDefinition {
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number;
  isLocked: boolean;
}

// Global event for badge unlocks so any page can listen
export const badgeUnlockEvent = new EventTarget();

export const useBadges = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [equippedBadge, setEquippedBadge] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    total_solves: number;
    streak_count: number;
    subject_solves: Record<string, number>;
    speed_solves: number;
    is_premium: boolean;
  } | null>(null);
  const hasCheckedRef = useRef(false);

  const fetchBadgesAndProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [badgesResult, profileResult] = await Promise.all([
        supabase
          .from('user_badges')
          .select('badge_key, unlocked_at, progress')
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('total_solves, streak_count, subject_solves, speed_solves, is_premium, equipped_badge')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (badgesResult.error) throw badgesResult.error;
      if (profileResult.error) throw profileResult.error;

      const unlockedBadges = badgesResult.data;
      const profileData = profileResult.data;

      const userProfile = profileData || {
        total_solves: 0,
        streak_count: 0,
        subject_solves: {},
        speed_solves: 0,
        is_premium: false,
      };

      const subjectSolves = typeof userProfile.subject_solves === 'string'
        ? JSON.parse(userProfile.subject_solves)
        : (userProfile.subject_solves || {});

      setProfile({ ...userProfile, subject_solves: subjectSolves });
      setEquippedBadge((profileData as any)?.equipped_badge || null);

      const badgesWithStatus: BadgeWithStatus[] = BADGE_DEFINITIONS.map(badge => {
        const unlockedBadge = unlockedBadges?.find(ub => ub.badge_key === badge.key);
        const isUnlocked = !!unlockedBadge;
        const isLocked = badge.isPremiumOnly && !userProfile.is_premium;

        let progress = 0;
        switch (badge.requirementType) {
          case 'total_solves':
            progress = Math.min(userProfile.total_solves || 0, badge.requirement);
            break;
          case 'streak':
            progress = Math.min(userProfile.streak_count || 0, badge.requirement);
            break;
          case 'subject_solves':
            const maxSubjectSolves = Math.max(0, ...Object.values(subjectSolves as Record<string, number>));
            progress = Math.min(maxSubjectSolves, badge.requirement);
            break;
          case 'speed_solves':
            progress = Math.min(userProfile.speed_solves || 0, badge.requirement);
            break;
          case 'early_solves': {
            // Check if user has ever solved before 8 AM
            const earlyCount = (userProfile as any).early_solves || 0;
            progress = Math.min(earlyCount, badge.requirement);
            break;
          }
        }

        return {
          ...badge,
          isUnlocked,
          unlockedAt: unlockedBadge?.unlocked_at,
          progress,
          isLocked,
        };
      });

      setBadges(badgesWithStatus);

      // Check and unlock badges after fetching
      await checkAndUnlockBadgesInternal(badgesWithStatus, userProfile, user.id);
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const checkAndUnlockBadgesInternal = async (
    badgeList: BadgeWithStatus[],
    userProfile: any,
    userId: string
  ) => {
    for (const badge of badgeList) {
      if (badge.isUnlocked || badge.isLocked) continue;
      if (badge.progress >= badge.requirement) {
        try {
          const { error } = await supabase
            .from('user_badges')
            .insert({
              user_id: userId,
              badge_key: badge.key,
              progress: badge.progress,
            });

          if (!error) {
            // Dispatch global event for the unlock toast
            const def = getBadgeByKey(badge.key);
            if (def) {
              badgeUnlockEvent.dispatchEvent(
                new CustomEvent('badge-unlocked', { detail: def })
              );
            }
            // Re-fetch to update UI
            fetchBadgesAndProfile();
          }
        } catch (error) {
          console.error('Error unlocking badge:', error);
        }
      }
    }
  };

  const equipBadge = useCallback(async (badgeKey: string | null) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ equipped_badge: badgeKey })
        .eq('user_id', user.id);
      if (!error) {
        setEquippedBadge(badgeKey);
      }
    } catch (error) {
      console.error('Error equipping badge:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchBadgesAndProfile();
  }, [fetchBadgesAndProfile]);

  return {
    badges,
    loading,
    profile,
    equippedBadge,
    equipBadge,
    refetch: fetchBadgesAndProfile,
  };
};
