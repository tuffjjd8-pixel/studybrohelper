import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, XCircle, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type VerificationStatus = "loading" | "success" | "error";

const PremiumSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verifySession = async () => {
      if (!sessionId) {
        setStatus("error");
        setErrorMessage("No session ID provided");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-checkout-session", {
          body: { sessionId },
        });

        if (error) {
          console.error("Verification error:", error);
          setStatus("error");
          setErrorMessage(error.message || "Failed to verify payment");
          return;
        }

        if (data?.success) {
          setStatus("success");
          // Auto-redirect after 3 seconds
          setTimeout(() => {
            navigate("/profile");
          }, 3000);
        } else {
          setStatus("error");
          setErrorMessage(data?.error || "Payment verification failed");
        }
      } catch (err) {
        console.error("Verification exception:", err);
        setStatus("error");
        setErrorMessage("Something went wrong. Please contact support.");
      }
    };

    verifySession();
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        {status === "loading" && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto"
            >
              <Loader2 className="w-10 h-10 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-heading font-bold">Verifying your payment...</h1>
            <p className="text-muted-foreground">Please wait while we confirm your premium subscription.</p>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto relative"
            >
              <Check className="w-10 h-10 text-green-500" />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute -top-2 -right-2"
              >
                <Crown className="w-8 h-8 text-primary" />
              </motion.div>
            </motion.div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-heading font-bold">
                <span className="text-gradient">Premium Activated!</span>
              </h1>
              <div className="flex items-center justify-center gap-2 text-primary">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">Welcome to StudyBro Premium</span>
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <p className="text-muted-foreground">
              Your premium features are now active. Enjoy enhanced AI solving, more animated steps, and priority support!
            </p>

            <div className="pt-4 space-y-3">
              <p className="text-sm text-muted-foreground">Redirecting to your profile in 3 seconds...</p>
              <Button onClick={() => navigate("/profile")} className="w-full">
                Go to Profile Now
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Start Solving
              </Button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto"
            >
              <XCircle className="w-10 h-10 text-destructive" />
            </motion.div>
            
            <h1 className="text-2xl font-heading font-bold">Payment Verification Failed</h1>
            <p className="text-muted-foreground">{errorMessage}</p>

            <div className="pt-4 space-y-3">
              <Button onClick={() => navigate("/premium")} className="w-full">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate("/profile")} className="w-full">
                Go to Profile
              </Button>
              <p className="text-xs text-muted-foreground">
                If you believe this is an error, please contact support.
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PremiumSuccess;
