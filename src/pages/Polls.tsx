import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { ToolsScroller } from "@/components/home/ToolsScroller";
import { PollsSection } from "@/components/settings/PollsSection";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";

const Polls = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} isPremium={true} />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-heading font-bold">Polls</h1>
                  <p className="text-sm text-muted-foreground">
                    Vote on community polls
                  </p>
                </div>
              </div>
            </div>

            {/* Polls Content */}
            <PollsSection />
          </motion.div>
        </div>
      </main>

      <ToolsScroller />
    </div>
  );
};

export default Polls;
