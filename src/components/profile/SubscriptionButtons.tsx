import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CreditCard, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';

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
  const [isLoading, setIsLoading] = useState(false);

  // Check if within 24 hours of purchase
  const isWithin24Hours = (): boolean => {
    if (!premiumSince) return false;
    const purchaseDate = new Date(premiumSince);
    const now = new Date();
    const hoursSincePurchase = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60);
    return hoursSincePurchase < 24;
  };

  const openBillingPortal = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('⚠️ Please sign in to manage your subscription');
        return;
      }

      console.log('Calling create-portal-session edge function...');
      
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Portal session response:', { data, error });

      if (error) {
        console.error('Portal session error:', error);
        alert('⚠️ Failed to open billing portal. Please try again.');
        return;
      }

      if (data?.error) {
        console.error('Portal session returned error:', data.error);
        alert(`⚠️ ${data.error}`);
        return;
      }

      if (data?.url) {
        console.log('Redirecting to billing portal:', data.url);
        window.location.href = data.url;
      } else {
        console.error('No URL returned from portal session');
        alert('⚠️ Failed to create billing portal session. Please try again.');
      }
    } catch (err) {
      console.error('Unexpected portal session error:', err);
      alert('⚠️ An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = () => {
    openBillingPortal();
  };

  const handleCancelSubscription = () => {
    if (isWithin24Hours()) {
      setShowCancelRestrictionModal(true);
      return;
    }
    openBillingPortal();
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
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4 mr-2" />
          )}
          Manage Subscription
          {!isLoading && <ExternalLink className="w-3 h-3 ml-2 opacity-50" />}
        </Button>

        <Button
          variant="outline"
          onClick={handleCancelSubscription}
          disabled={isLoading}
          className="w-full text-muted-foreground hover:text-destructive hover:border-destructive/50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4 mr-2" />
          )}
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