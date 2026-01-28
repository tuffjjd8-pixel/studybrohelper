import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BADGE_DEFINITIONS, BadgeDefinition } from '@/lib/badgeDefinitions';
import { toast } from 'sonner';

export interface UserBadge {
  badge_key: string;
  unlocked_at: string;
  progress: number;
}

export interface BadgeWithStatus extends BadgeDefinition {
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number;
  isLocked: boolean; // Premium badge for free user
}

export const useBadges = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    total_solves: number;
    streak_count: number;
    subject_solves: Record<string, number>;
    referral_count: number;
    is_premium: boolean;
  } | null>(null);

  const fetchBadgesAndProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch user's unlocked badges
      const { data: unlockedBadges, error: badgesError } = await supabase
        .from('user_badges')
        .select('badge_key, unlocked_at, progress')
        .eq('user_id', user.id);

      if (badgesError) throw badgesError;

      // Fetch profile data for progress calculation
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('total_solves, streak_count, subject_solves, referral_count, is_premium')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const userProfile = profileData || {
        total_solves: 0,
        streak_count: 0,
        subject_solves: {},
        referral_count: 0,
        is_premium: false,
      };

      // Parse subject_solves if it's a string
      const subjectSolves = typeof userProfile.subject_solves === 'string' 
        ? JSON.parse(userProfile.subject_solves) 
        : (userProfile.subject_solves || {});

      setProfile({
        ...userProfile,
        subject_solves: subjectSolves,
      });

      // Map badges with their unlock status and progress
      const badgesWithStatus: BadgeWithStatus[] = BADGE_DEFINITIONS.map(badge => {
        const unlockedBadge = unlockedBadges?.find(ub => ub.badge_key === badge.key);
        const isUnlocked = !!unlockedBadge;
        const isLocked = badge.isPremiumOnly && !userProfile.is_premium;

        // Calculate progress based on requirement type
        let progress = 0;
        switch (badge.requirementType) {
          case 'total_solves':
            progress = Math.min(userProfile.total_solves || 0, badge.requirement);
            break;
          case 'streak':
            progress = Math.min(userProfile.streak_count || 0, badge.requirement);
            break;
          case 'subject_solves':
            // Get max solves from any subject
            const maxSubjectSolves = Math.max(0, ...Object.values(subjectSolves as Record<string, number>));
            progress = Math.min(maxSubjectSolves, badge.requirement);
            break;
          case 'referrals':
            progress = Math.min(userProfile.referral_count || 0, badge.requirement);
            break;
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
    } catch (error) {
      console.error('Error fetching badges:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const checkAndUnlockBadges = useCallback(async () => {
    if (!user || !profile) return;

    for (const badge of badges) {
      if (badge.isUnlocked || badge.isLocked) continue;

      const shouldUnlock = badge.progress >= badge.requirement;

      if (shouldUnlock) {
        try {
          const { error } = await supabase
            .from('user_badges')
            .insert({
              user_id: user.id,
              badge_key: badge.key,
              progress: badge.progress,
            });

          if (!error) {
            toast.success(`🎉 Badge Unlocked: ${badge.name}!`, {
              description: badge.description,
            });
            // Refresh badges
            fetchBadgesAndProfile();
          }
        } catch (error) {
          console.error('Error unlocking badge:', error);
        }
      }
    }
  }, [user, profile, badges, fetchBadgesAndProfile]);

  useEffect(() => {
    fetchBadgesAndProfile();
  }, [fetchBadgesAndProfile]);

  useEffect(() => {
    if (badges.length > 0 && profile) {
      checkAndUnlockBadges();
    }
  }, [profile, checkAndUnlockBadges]);

  return {
    badges,
    loading,
    profile,
    refetch: fetchBadgesAndProfile,
  };
};
