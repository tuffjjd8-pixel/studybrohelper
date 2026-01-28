import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CreditCard, XCircle, ExternalLink } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SubscriptionButtonsProps {
  isPremium: boolean;
  premiumSince?: string | null;
  subscriptionId?: string | null;
}

export const SubscriptionButtons = ({
  isPremium,
  premiumSince,
  subscriptionId,
}: SubscriptionButtonsProps) => {
  const [showCancelRestrictionModal, setShowCancelRestrictionModal] = useState(false);

  // Check if within 24 hours of purchase
  const isWithin24Hours = (): boolean => {
    if (!premiumSince) return false;
    const purchaseDate = new Date(premiumSince);
    const now = new Date();
    const hoursSincePurchase = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60);
    return hoursSincePurchase < 24;
  };

  const handleManageSubscription = () => {
    // Open Stripe customer portal
    const portalUrl = `https://billing.stripe.com/p/login/test_14k28O8CI5SDbgQ3cc`;
    window.open(portalUrl, '_blank');
  };

  const handleCancelSubscription = () => {
    if (isWithin24Hours()) {
      setShowCancelRestrictionModal(true);
      return;
    }
    // Open Stripe customer portal for cancellation
    const portalUrl = `https://billing.stripe.com/p/login/test_14k28O8CI5SDbgQ3cc`;
    window.open(portalUrl, '_blank');
  };

  if (!isPremium || !subscriptionId) {
    return null;
  }

  const hoursRemaining = premiumSince
    ? Math.max(0, 24 - (new Date().getTime() - new Date(premiumSince).getTime()) / (1000 * 60 * 60))
    : 0;

  return (
    <>
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
          <CreditCard className="w-4 h-4 mr-2" />
          Manage Subscription
          <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
        </Button>

        <Button
          variant="outline"
          onClick={handleCancelSubscription}
          className="w-full text-muted-foreground hover:text-destructive hover:border-destructive/50"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Cancel Premium
        </Button>
      </motion.div>

      {/* 24-hour restriction modal */}
      <AlertDialog open={showCancelRestrictionModal} onOpenChange={setShowCancelRestrictionModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="text-2xl">⏰</span>
              Cancellation Not Available Yet
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Cancellation is not available within 24 hours of purchase to ensure you have time
                to fully experience Premium features.
              </p>
              <p className="text-sm font-medium text-foreground">
                You can cancel in approximately {Math.ceil(hoursRemaining)} hours.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCancelRestrictionModal(false)}>
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
