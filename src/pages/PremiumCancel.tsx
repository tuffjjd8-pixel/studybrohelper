import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Crown, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PremiumCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto relative"
        >
          <Crown className="w-10 h-10 text-muted-foreground" />
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
            <XCircle className="w-6 h-6 text-muted-foreground" />
          </div>
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-2xl font-heading font-bold">Payment Cancelled</h1>
          <p className="text-muted-foreground">
            No worries! Your payment was cancelled and you haven't been charged.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 text-left space-y-2">
          <p className="text-sm font-medium">Still interested in Premium?</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 16 animated steps per day</li>
            <li>• 25 speech-to-text clips daily</li>
            <li>• Advanced AI models</li>
            <li>• Priority support</li>
          </ul>
        </div>

        <div className="pt-4 space-y-3">
          <Button onClick={() => navigate("/premium")} className="w-full gap-2">
            <Crown className="w-4 h-4" />
            View Premium Plans
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default PremiumCancel;
