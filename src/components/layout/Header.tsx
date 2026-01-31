import { StreakCounter } from "@/components/gamification/StreakCounter";
import { motion } from "framer-motion";
import { Sparkles, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface HeaderProps {
  streak: number;
  totalSolves: number;
  isPremium?: boolean;
}

export function Header({ streak, totalSolves, isPremium }: HeaderProps) {
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
        {/* Logo - offset to right to make room for sidebar trigger */}
        <Link to="/" className="flex items-center gap-2 ml-12">
          <motion.div
            whileHover={{ rotate: 10 }}
            className="p-2 bg-primary/10 rounded-xl"
          >
            <Sparkles className="w-6 h-6 text-primary" />
          </motion.div>
          <div>
            <h1 className="font-heading font-bold text-lg leading-none">
              Study<span className="text-primary">Bro</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">AI</p>
          </div>
        </Link>

        {/* Stats & Premium */}
        <div className="flex items-center gap-3">
          <StreakCounter streak={streak} totalSolves={totalSolves} />
          
          {!isPremium && (
            <Link to="/premium">
              <Button variant="cyan" size="sm" className="gap-1.5 hidden sm:flex">
                <Crown className="w-4 h-4" />
                <span>Go Pro</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </motion.header>
  );
}
