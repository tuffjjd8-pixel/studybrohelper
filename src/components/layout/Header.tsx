import { StreakCounter } from "@/components/gamification/StreakCounter";
import { motion } from "framer-motion";
import { Crown, LogIn, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AIBrainIcon } from "@/components/ui/AIBrainIcon";
import { openPremiumPage } from "@/lib/mobileDetection";

interface HeaderProps {
  streak: number;
  totalSolves: number;
  isPremium?: boolean;
}

export function Header({ streak, totalSolves, isPremium }: HeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleProClick = () => {
    openPremiumPage(navigate);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="
        fixed top-0 left-0 right-0 z-50
        bg-background/80 backdrop-blur-xl border-b border-border/50
        px-4 py-3
      "
    >
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.05 }}
            className="p-2 bg-primary/10 rounded-xl"
          >
            <AIBrainIcon size="lg" glowIntensity="strong" />
          </motion.div>
          <div>
            <h1 className="font-heading font-bold text-lg leading-none">
              Study<span className="text-primary">Bro</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">AI</p>
          </div>
        </Link>

        {/* Stats & Premium & Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/polls">
            <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-foreground">
              <BarChart3 className="w-4 h-4" />
            </Button>
          </Link>
          <StreakCounter streak={streak} totalSolves={totalSolves} />
          
          {!isPremium && (
            <Button 
              variant="cyan" 
              size="sm" 
              className="gap-1 px-2 sm:px-3"
              onClick={handleProClick}
            >
              <Crown className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Pro</span>
            </Button>
          )}
          
          {!user && (
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground px-2 sm:px-3">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Sign in</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </motion.header>
  );
}
