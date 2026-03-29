import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeDefinition } from '@/lib/badgeDefinitions';
import { Button } from '@/components/ui/button';

interface BadgeUnlockToastProps {
  badge: BadgeDefinition | null;
  onClose: () => void;
}

export const BadgeUnlockToast = ({ badge, onClose }: BadgeUnlockToastProps) => {
  useEffect(() => {
    if (badge) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [badge, onClose]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="bg-card border border-primary/50 rounded-2xl p-8 max-w-xs w-full text-center shadow-[0_0_40px_hsl(var(--primary)/0.3)] badge-pop-in badge-glow-pulse badge-shine"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.6 }}
              className="text-6xl mb-4"
            >
              {badge.icon}
            </motion.div>
            <div className="text-xs uppercase tracking-widest text-primary font-bold mb-2">
              🎉 Badge Unlocked!
            </div>
            <h2 className="text-xl font-heading font-bold mb-2">{badge.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">{badge.description}</p>
            <Button size="sm" onClick={onClose}>
              Awesome!
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
