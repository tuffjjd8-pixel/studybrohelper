import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const TOP_SHARER_THRESHOLD = 50; // Confirmed likes threshold
const POPUP_COOLDOWN_KEY = "top_sharer_popup_dismissed";
const COOLDOWN_HOURS = 24;

export const TopSharerPopup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Check cooldown
    const lastDismissed = localStorage.getItem(POPUP_COOLDOWN_KEY);
    if (lastDismissed) {
      const elapsed = Date.now() - parseInt(lastDismissed);
      if (elapsed < COOLDOWN_HOURS * 60 * 60 * 1000) return;
    }

    checkTopSharer();
  }, [user]);

  const checkTopSharer = async () => {
    try {
      const { data, error } = await supabase
        .from("share_likes")
        .select("likes_confirmed")
        .eq("user_id", user!.id)
        .eq("status", "approved");

      if (error) throw error;

      const total = (data || []).reduce((sum, row) => sum + (row.likes_confirmed || 0), 0);
      setTotalLikes(total);

      if (total >= TOP_SHARER_THRESHOLD) {
        setShow(true);
      }
    } catch (error) {
      console.error("Error checking top sharer:", error);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(POPUP_COOLDOWN_KEY, String(Date.now()));
  };

  const handleViewOffer = () => {
    handleDismiss();
    navigate("/community-reward");
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 40 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm p-6 bg-card rounded-2xl border border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.2)] space-y-4 text-center relative"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-amber-500 flex items-center justify-center mx-auto">
              <Star className="w-8 h-8 text-primary-foreground" />
            </div>

            <h2 className="text-xl font-heading font-bold">Congrats! 🎉</h2>
            <p className="text-sm text-muted-foreground">
              You're one of the top sharers this week with <span className="font-bold text-foreground">{totalLikes}</span> confirmed likes!
            </p>
            <p className="text-sm text-muted-foreground">
              Tap below to see your special offer.
            </p>

            <Button onClick={handleViewOffer} className="w-full">
              <Heart className="w-4 h-4 mr-2" />
              See Your Reward
            </Button>

            <p className="text-xs text-muted-foreground">
              Rewards are confirmed by admin. This does not guarantee a prize.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
