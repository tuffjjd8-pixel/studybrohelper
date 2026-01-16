import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, ChevronDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Solve {
  id: string;
  subject: string;
  question_text: string | null;
  solution_markdown: string;
  created_at: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

const Quiz = () => {
  const { user, loading: authLoading } = useAuth();
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSolve, setSelectedSolve] = useState<Solve | null>(null);
  const [questionCount, setQuestionCount] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizQuestion[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSolves();
    } else if (!authLoading) {
      loadGuestHistory();
    }
  }, [user, authLoading]);

  const loadGuestHistory = () => {
    try {
      const guestSolves = localStorage.getItem("guest_solves");
      if (guestSolves) {
        setSolves(JSON.parse(guestSolves));
      }
    } catch (error) {
      console.error("Error loading guest history:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSolves = async () => {
    try {
      const { data, error } = await supabase
        .from("solves")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSolves(data || []);
    } catch (error) {
      console.error("Error fetching solves:", error);
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const filteredSolves = solves.filter(
    (solve) =>
      solve.question_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      solve.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerate = async () => {
    if (!selectedSolve) {
      toast.error("Please select a conversation first");
      return;
    }

    setGenerating(true);
    setQuizResult(null);

    try {
      const count = questionCount ? parseInt(questionCount) : 5;
      const validCount = Math.min(Math.max(count, 1), 20);

      const conversationText = `Question: ${selectedSolve.question_text || "Image-based question"}\n\nSolution: ${selectedSolve.solution_markdown}`;

      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          conversationText,
          questionCount: validCount,
          subject: selectedSolve.subject,
        },
      });

      if (error) throw error;

      if (data?.quiz) {
        setQuizResult(data.quiz);
        toast.success(`Generated ${data.quiz.length} questions`);
      } else {
        throw new Error("Invalid response from quiz generator");
      }
    } catch (error) {
      console.error("Quiz generation error:", error);
      toast.error("Failed to generate quiz");
    } finally {
      setGenerating(false);
    }
  };

  const handleCountChange = (value: string) => {
    const num = parseInt(value);
    if (value === "" || (num >= 1 && num <= 20)) {
      setQuestionCount(value);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={solves.length} />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-2xl font-heading font-bold mb-2 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Quiz Generator
            </h1>
            <p className="text-muted-foreground text-sm">
              Generate quiz questions from your solved problems
            </p>
          </motion.div>

          {/* Configuration Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-6 mb-6"
          >
            {/* Conversation Selector */}
            <div className="space-y-2 mb-6">
              <Label>Select a conversation</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between text-left font-normal h-auto min-h-11 py-2"
                  >
                    {selectedSolve ? (
                      <span className="truncate">
                        {selectedSolve.question_text || "Image question"} ({selectedSolve.subject})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Choose a solved problem...</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search conversations..." 
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {loading ? "Loading..." : "No conversations found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredSolves.map((solve) => (
                          <CommandItem
                            key={solve.id}
                            value={solve.id}
                            onSelect={() => {
                              setSelectedSolve(solve);
                              setOpen(false);
                              setSearchQuery("");
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedSolve?.id === solve.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm">
                                {solve.question_text || "Image question"}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {solve.subject}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Question Count Input */}
            <div className="space-y-2 mb-6">
              <Label htmlFor="questionCount">
                Number of questions <span className="text-muted-foreground">(optional, 1-20)</span>
              </Label>
              <Input
                id="questionCount"
                type="number"
                min={1}
                max={20}
                placeholder="5"
                value={questionCount}
                onChange={(e) => handleCountChange(e.target.value)}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for default (5 questions)
              </p>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!selectedSolve || generating}
              className="w-full gap-2"
              variant="neon"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Quiz
                </>
              )}
            </Button>

            {/* Model Info */}
            <p className="text-xs text-center text-muted-foreground mt-4">
              Powered by Groq llama-3.3-70B for high-accuracy, stable question generation
            </p>
          </motion.div>

          {/* Results Section - Clean JSON only */}
          {quizResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-background rounded-lg p-4 overflow-x-auto"
            >
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                {JSON.stringify(quizResult, null, 2)}
              </pre>
            </motion.div>
          )}

          {/* Empty State */}
          {!quizResult && !generating && solves.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-5xl mb-4">📚</div>
              <p className="text-muted-foreground">
                No solved problems yet. Solve some homework first!
              </p>
            </motion.div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Quiz;
