import { motion } from "framer-motion";
import { Menu } from "lucide-react";

interface SidebarTriggerProps {
  onClick: () => void;
}

export function SidebarTrigger({ onClick }: SidebarTriggerProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-card/80 backdrop-blur-xl border border-border/50 flex items-center justify-center hover:bg-card transition-colors"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5 text-primary" />
    </motion.button>
  );
}
