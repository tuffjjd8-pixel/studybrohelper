import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Award, ChevronRight } from 'lucide-react';
import { useBadges } from '@/hooks/useBadges';

export const BadgesButton = () => {
  const navigate = useNavigate();
  const { badges, loading } = useBadges();

  const unlockedCount = badges.filter(b => b.isUnlocked).length;
  const totalBadges = badges.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Button
        variant="outline"
        onClick={() => navigate('/badges')}
        className="w-full h-auto py-4 justify-between bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 hover:border-primary/40"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Award className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <div className="font-heading font-bold">Badges</div>
            <div className="text-xs text-muted-foreground">
              {loading ? (
                'Loading...'
              ) : (
                <>
                  {unlockedCount}/{totalBadges} unlocked
                </>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </Button>
    </motion.div>
  );
};
