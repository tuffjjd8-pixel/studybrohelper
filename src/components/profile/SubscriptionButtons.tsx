import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ExternalLink, RotateCcw, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { PlayBillingService } from '@/lib/playBilling';
import { toast } from 'sonner';

interface SubscriptionButtonsProps {
  isPremium: boolean;
  premiumSince?: string | null;
  subscriptionId?: string | null;
}

export const SubscriptionButtons = ({
  isPremium,
}: SubscriptionButtonsProps) => {
  const [isRestoring, setIsRestoring] = useState(false);

  if (!isPremium) return null;

  const handleManageSubscription = () => {
    // On Android, this would deep-link to Google Play subscriptions
    // On web, direct the user to manage via Google Play Store app
    toast.info('To manage your subscription, open the Google Play Store app → Menu → Subscriptions.');
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      const restored = await PlayBillingService.restorePurchases();
      if (restored.length > 0) {
        toast.success('Purchases restored successfully!');
      } else {
        toast.info('No previous purchases found.');
      }
    } catch {
      toast.error('Failed to restore purchases.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="space-y-3"
    >
      <Button
        variant="outline"
        onClick={handleManageSubscription}
        className="w-full"
      >
        Manage Subscription
        <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
      </Button>

      <Button
        variant="outline"
        onClick={handleRestorePurchases}
        disabled={isRestoring}
        className="w-full text-muted-foreground"
      >
        {isRestoring ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <RotateCcw className="w-4 h-4 mr-2" />
        )}
        Restore Purchases
      </Button>
    </motion.div>
  );
};
