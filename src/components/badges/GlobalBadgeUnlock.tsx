import { useState, useEffect, useCallback } from 'react';
import { BadgeDefinition } from '@/lib/badgeDefinitions';
import { badgeUnlockEvent } from '@/hooks/useBadges';
import { BadgeUnlockToast } from '@/components/badges/BadgeUnlockToast';

/**
 * Global badge unlock listener. Place this once in a layout-level component (e.g., App or Index).
 */
export const GlobalBadgeUnlock = () => {
  const [unlockedBadge, setUnlockedBadge] = useState<BadgeDefinition | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<BadgeDefinition>).detail;
      setUnlockedBadge(detail);
    };
    badgeUnlockEvent.addEventListener('badge-unlocked', handler);
    return () => badgeUnlockEvent.removeEventListener('badge-unlocked', handler);
  }, []);

  const handleClose = useCallback(() => setUnlockedBadge(null), []);

  return <BadgeUnlockToast badge={unlockedBadge} onClose={handleClose} />;
};
