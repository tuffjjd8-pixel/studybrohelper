import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, ChevronDown, Check, RotateCcw } from "lucide-react";
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
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

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
    setSelectedAnswers({});
    setCurrentQuestion(0);

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

  const handleSelectOption = (questionIndex: number, option: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: option,
    }));
  };

  const handleNextQuestion = () => {
    if (quizResult && currentQuestion < quizResult.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    setQuizResult(null);
    setSelectedAnswers({});
    setCurrentQuestion(0);
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

          {/* Interactive Quiz UI */}
          <AnimatePresence mode="wait">
            {quizResult && quizResult.length > 0 && (
              <motion.div
                key="quiz-ui"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Progress indicator */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Question {currentQuestion + 1} of {quizResult.length}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRestart}
                    className="gap-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    New Quiz
                  </Button>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestion + 1) / quizResult.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Question Card */}
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <h2 className="text-lg font-medium mb-6">
                    {quizResult[currentQuestion].question}
                  </h2>

                  {/* Options */}
                  <div className="space-y-3">
                    {quizResult[currentQuestion].options.map((option, idx) => {
                      const isSelected = selectedAnswers[currentQuestion] === option;
                      return (
                        <motion.button
                          key={idx}
                          onClick={() => handleSelectOption(currentQuestion, option)}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border transition-all",
                            isSelected
                              ? "bg-primary/10 border-primary text-foreground"
                              : "bg-card border-border hover:border-primary/50 text-foreground"
                          )}
                        >
                          <span className="font-medium">{option}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Navigation */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePrevQuestion}
                    disabled={currentQuestion === 0}
                    className="flex-1"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={handleNextQuestion}
                    disabled={currentQuestion === quizResult.length - 1}
                    className="flex-1"
                  >
                    Next
                  </Button>
                </div>

                {/* Completion message */}
                {Object.keys(selectedAnswers).length === quizResult.length && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center p-4 bg-primary/10 rounded-xl"
                  >
                    <p className="text-primary font-medium">
                      ✓ You've answered all {quizResult.length} questions!
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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
