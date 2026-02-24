import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { useBadges, BadgeWithStatus } from '@/hooks/useBadges';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Lock, Crown, Sparkles } from 'lucide-react';

const BadgeCard = ({ badge, onClick }: { badge: BadgeWithStatus; onClick: () => void }) => {
  const progressPercent = (badge.progress / badge.requirement) * 100;
  const isCompleted = badge.isUnlocked;
  const isPremiumLocked = badge.isLocked;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={isCompleted ? { scale: 1.05 } : undefined}
      whileTap={isCompleted ? { scale: 0.95 } : undefined}
      onClick={isCompleted ? onClick : undefined}
      className={`relative p-4 rounded-2xl border transition-all duration-300 ${
        isCompleted
          ? 'bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/20 border-primary/50 cursor-pointer shadow-lg shadow-primary/20 badge-pop-in badge-glow-pulse badge-shine'
          : isPremiumLocked
          ? 'bg-card/50 border-border/50 opacity-60 badge-pop-in'
          : 'bg-card border-border badge-pop-in'
      }`}
    >
      {/* Premium lock indicator */}
      {isPremiumLocked && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-primary/20 rounded-full">
          <Crown className="w-3 h-3 text-primary" />
          <span className="text-[10px] text-primary font-medium">Premium</span>
        </div>
      )}

      {/* Badge icon */}
      <div
        className={`text-4xl mb-3 ${
          isCompleted ? '' : isPremiumLocked ? 'grayscale opacity-50' : 'grayscale opacity-70'
        }`}
      >
        {badge.icon}
      </div>

      {/* Badge name */}
      <h3
        className={`font-heading font-bold text-sm mb-1 ${
          isCompleted ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {badge.name}
      </h3>

      {/* Badge description */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{badge.description}</p>

      {/* Progress bar or completed indicator */}
      {isCompleted ? (
        <div className="flex items-center gap-1 text-xs text-primary">
          <Sparkles className="w-3 h-3" />
          <span>Unlocked!</span>
        </div>
      ) : isPremiumLocked ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" />
          <span>Premium Only</span>
        </div>
      ) : (
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground text-right">
            {badge.progress}/{badge.requirement}
          </p>
        </div>
      )}
    </motion.div>
  );
};

const BadgeCollection = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { badges, loading, profile } = useBadges();
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithStatus | null>(null);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading badges...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header streak={0} totalSolves={0} />
        <main className="pt-20 pb-24 px-4">
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="text-6xl mb-4">🏅</div>
            <h1 className="text-2xl font-heading font-bold mb-2">Badge Collection</h1>
            <p className="text-muted-foreground mb-6">Sign in to view and earn badges!</p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const unlockedCount = badges.filter(b => b.isUnlocked).length;
  const totalBadges = badges.length;
  const freeBadges = badges.filter(b => !b.isPremiumOnly);
  const premiumBadges = badges.filter(b => b.isPremiumOnly);

  return (
    <div className="min-h-screen bg-background">
      <Header streak={profile?.streak_count || 0} totalSolves={profile?.total_solves || 0} />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-lg mx-auto">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/profile')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Profile
          </Button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="text-5xl mb-3">🏅</div>
            <h1 className="text-2xl font-heading font-bold mb-2">Badge Collection</h1>
            <p className="text-muted-foreground">
              {unlockedCount}/{totalBadges} badges unlocked
            </p>
          </motion.div>

          {/* Free Badges Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
              <span className="text-xl">⭐</span>
              Free Badges
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {freeBadges.map((badge, index) => (
                <motion.div
                  key={badge.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <BadgeCard badge={badge} onClick={() => setSelectedBadge(badge)} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Premium Badges Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Premium Badges
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {premiumBadges.map((badge, index) => (
                <motion.div
                  key={badge.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <BadgeCard badge={badge} onClick={() => setSelectedBadge(badge)} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Premium upsell for free users */}
          {!profile?.is_premium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 p-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 rounded-xl border border-primary/30 text-center"
            >
              <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-heading font-bold mb-1">Unlock Premium Badges</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Upgrade to access exclusive premium badges!
              </p>
              <Button onClick={() => navigate('/premium')} size="sm">
                Go Premium
              </Button>
            </motion.div>
          )}
        </div>
      </main>

      {/* Badge detail modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full text-center badge-unlock-enter badge-shine"
              onClick={e => e.stopPropagation()}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{ duration: 0.5 }}
                className="text-6xl mb-4"
              >
                {selectedBadge.icon}
              </motion.div>
              <h2 className="text-xl font-heading font-bold mb-2">{selectedBadge.name}</h2>
              <p className="text-muted-foreground mb-4">{selectedBadge.description}</p>
              {selectedBadge.isUnlocked && selectedBadge.unlockedAt && (
                <p className="text-xs text-primary">
                  Unlocked on {new Date(selectedBadge.unlockedAt).toLocaleDateString()}
                </p>
              )}
              <Button className="mt-4" onClick={() => setSelectedBadge(null)}>
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default BadgeCollection;
