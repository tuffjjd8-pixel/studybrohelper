import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Brain, Trophy, BarChart3 } from "lucide-react";

const hubItems = [
  {
    icon: Brain,
    label: "Quiz",
    description: "Test your knowledge",
    path: "/quiz",
  },
  {
    icon: Trophy,
    label: "Results",
    description: "View your scores",
    path: "/results",
  },
  {
    icon: BarChart3,
    label: "Polls",
    description: "Vote on community polls",
    path: "/polls",
  },
];

const Hub = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} isPremium={true} />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-lg mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-heading font-bold">Hub</h1>
            <p className="text-sm text-muted-foreground">
              All your tools in one place
            </p>
          </div>

          <div className="grid gap-3">
            {hubItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-heading font-semibold text-foreground">
                    {item.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Hub;
