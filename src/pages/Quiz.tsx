import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ChevronDown, Check, RotateCcw, Trophy, Eye, Lock, CheckCircle2, XCircle, Crown, AlertCircle, Calculator } from "lucide-react";
import { AIBrainIcon } from "@/components/ui/AIBrainIcon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
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
import { isSolveRequest } from "@/lib/intentRouting";

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
  explanation: string;
}

interface Profile {
  is_premium?: boolean;
  quizzes_used_today?: number;
  last_quiz_reset?: string;
}

// Tier constants
const FREE_MAX_QUESTIONS = 10;
const PREMIUM_MAX_QUESTIONS = 20;
const FREE_DAILY_QUIZZES = 7;
const PREMIUM_DAILY_QUIZZES = 13;

const Quiz = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSolve, setSelectedSolve] = useState<Solve | null>(null);
  const [questionCount, setQuestionCount] = useState<string>("");
  const [strictCountMode, setStrictCountMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizQuestion[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quizzesUsedToday, setQuizzesUsedToday] = useState(0);

  // Detect if user is typing equation-related content
  const showSolveRedirect = useMemo(() => {
    return isSolveRequest(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      fetchSolves();
      fetchProfile();
    } else if (!authLoading) {
      loadGuestHistory();
    }
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("is_premium, quizzes_used_today, last_quiz_reset")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        // Check if we need to reset the daily counter
        const lastReset = data.last_quiz_reset ? new Date(data.last_quiz_reset) : null;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (!lastReset || lastReset < today) {
          setQuizzesUsedToday(0);
        } else {
          setQuizzesUsedToday(data.quizzes_used_today || 0);
        }
        
        setProfile(data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

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

  const isPremium = profile?.is_premium === true;
  const maxQuestions = isPremium ? PREMIUM_MAX_QUESTIONS : FREE_MAX_QUESTIONS;
  const dailyLimit = isPremium ? PREMIUM_DAILY_QUIZZES : FREE_DAILY_QUIZZES;
  const quizzesRemaining = dailyLimit - quizzesUsedToday;
  const canGenerateQuiz = quizzesRemaining > 0;
  const usagePercent = (quizzesUsedToday / dailyLimit) * 100;

  const handleGenerate = async () => {
    if (!selectedSolve) {
      toast.error("Please select a conversation first");
      return;
    }

    // Check daily limit
    if (!canGenerateQuiz) {
      toast.error("Daily quiz limit reached. Try again tomorrow or upgrade for more.");
      return;
    }

    // Validate question count
    const count = questionCount ? parseInt(questionCount) : 5;
    if (count > maxQuestions && !isPremium) {
      toast.error(`Upgrade to Premium to unlock quizzes with more than ${FREE_MAX_QUESTIONS} questions`);
      return;
    }

    // Validate strict count mode
    if (strictCountMode && !isPremium) {
      toast.error("Strict Count Mode is a Premium feature");
      return;
    }

    setGenerating(true);
    setQuizResult(null);
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setSubmitted(false);
    setReviewMode(false);

    try {
      const validCount = Math.min(Math.max(count, 1), maxQuestions);

      const conversationText = `Question: ${selectedSolve.question_text || "Image-based question"}\n\nSolution: ${selectedSolve.solution_markdown}`;

      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          conversationText,
          questionCount: validCount,
          subject: selectedSolve.subject,
          strictCountMode: isPremium ? strictCountMode : false,
        },
      });

      if (error) throw error;

      if (data?.error === "daily_limit_reached") {
        toast.error(data.message || "Daily quiz limit reached");
        return;
      }

      if (data?.quiz) {
        setQuizResult(data.quiz);
        setQuizzesUsedToday(data.quizzesUsed || quizzesUsedToday + 1);
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

  const getOptionLetter = (option: string): string => {
    const match = option.match(/^([A-D])\)/);
    return match ? match[1] : option.charAt(0).toUpperCase();
  };

  const isCorrectAnswer = (questionIndex: number, option: string): boolean => {
    if (!quizResult) return false;
    const correctLetter = quizResult[questionIndex].answer;
    const selectedLetter = getOptionLetter(option);
    return selectedLetter === correctLetter;
  };

  const handleSelectOption = (questionIndex: number, option: string) => {
    if (submitted) return; // No changes after submission
    
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

  const handleSubmit = () => {
    if (!quizResult) return;
    setSubmitted(true);
    toast.success("Quiz submitted!");
  };

  const handleRestart = () => {
    setQuizResult(null);
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setSubmitted(false);
    setReviewMode(false);
  };

  const handleCountChange = (value: string) => {
    const num = parseInt(value);
    if (value === "" || (num >= 1 && num <= maxQuestions)) {
      setQuestionCount(value);
    }
  };

  const calculateScore = (): { correct: number; total: number } => {
    if (!quizResult) return { correct: 0, total: 0 };
    
    let correct = 0;
    quizResult.forEach((q, idx) => {
      const selectedOption = selectedAnswers[idx];
      if (selectedOption && isCorrectAnswer(idx, selectedOption)) {
        correct++;
      }
    });
    
    return { correct, total: quizResult.length };
  };

  const allQuestionsAnswered = quizResult 
    ? Object.keys(selectedAnswers).length === quizResult.length 
    : false;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const score = calculateScore();

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
              <AIBrainIcon size="lg" glowIntensity="medium" />
              Quiz Generator
            </h1>
            <p className="text-muted-foreground text-sm">
              Generate quiz questions from your solved problems
            </p>
          </motion.div>

          {/* Usage Counter Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card border border-border rounded-xl p-4 mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Quizzes Remaining</span>
              <span className="text-sm text-muted-foreground">
                {quizzesUsedToday}/{dailyLimit} used today
              </span>
            </div>
            <Progress value={usagePercent} className="h-2 mb-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{quizzesRemaining} remaining</span>
              <span>Resets at midnight</span>
            </div>
            
            {!canGenerateQuiz && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">
                  Daily limit reached. 
                  {!isPremium && (
                    <Link to="/premium" className="ml-1 underline">Upgrade for more</Link>
                  )}
                </span>
              </div>
            )}
          </motion.div>

          {/* Configuration Card - Hide when quiz is active */}
          {!quizResult && (
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
                        {/* Show redirect message when user types equation-related terms */}
                        {showSolveRedirect && (
                          <div className="p-3 border-b border-border bg-primary/5">
                            <div className="flex items-start gap-2">
                              <Calculator className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-primary">
                                  Looking to solve equations?
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Use Solve Homework for equations and calculations.
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="mt-2 h-7 text-xs"
                                  onClick={() => {
                                    setOpen(false);
                                    navigate("/");
                                  }}
                                >
                                  Go to Solve Homework
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
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
                  Number of questions <span className="text-muted-foreground">(1-{maxQuestions})</span>
                </Label>
                <Input
                  id="questionCount"
                  type="number"
                  min={1}
                  max={maxQuestions}
                  placeholder="5"
                  value={questionCount}
                  onChange={(e) => handleCountChange(e.target.value)}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for default (5 questions)
                  {!isPremium && (
                    <span className="block mt-1">
                      <Crown className="w-3 h-3 inline mr-1" />
                      Upgrade to Premium for up to {PREMIUM_MAX_QUESTIONS} questions
                    </span>
                  )}
                </p>
              </div>

              {/* Strict Count Mode Toggle */}
              <div className={cn(
                "flex items-center justify-between p-4 rounded-lg mb-6",
                isPremium ? "bg-muted/30" : "bg-muted/10 border border-dashed border-border"
              )}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="strict-count" className="text-sm font-medium">
                      Strict Count Mode
                    </Label>
                    {!isPremium && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Premium
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isPremium 
                      ? (strictCountMode 
                          ? "Always generate the exact number of questions requested" 
                          : "Generate only what the conversation supports")
                      : "Force exact question count (Premium only)"
                    }
                  </p>
                </div>
                <Switch
                  id="strict-count"
                  checked={isPremium ? strictCountMode : false}
                  onCheckedChange={(checked) => {
                    if (!isPremium) {
                      toast.error("Strict Count Mode is a Premium feature");
                      return;
                    }
                    setStrictCountMode(checked);
                  }}
                  disabled={!isPremium}
                />
              </div>

              {/* Premium Upsell */}
              {!isPremium && (
                <Link to="/premium" className="block mb-6">
                  <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-xl text-sm hover:bg-primary/20 transition-colors">
                    <Crown className="w-4 h-4 text-primary" />
                    <span>Upgrade for more questions & Strict Count Mode</span>
                  </div>
                </Link>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!selectedSolve || generating || !canGenerateQuiz}
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
                    <AIBrainIcon size="md" glowIntensity="medium" />
                    Generate Quiz
                  </>
                )}
              </Button>

              {/* Model Info */}
              <p className="text-xs text-center text-muted-foreground mt-4">
                Powered by Groq llama-3.3-70B for high-accuracy, stable question generation
              </p>
            </motion.div>
          )}

          {/* Score Card - Show after submission */}
          <AnimatePresence>
            {submitted && quizResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 rounded-xl p-6 mb-6 text-center"
              >
                <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
                <h2 className="text-2xl font-heading font-bold mb-2">
                  {score.correct} out of {score.total} correct!
                </h2>
                <p className="text-muted-foreground mb-4">
                  {score.correct === score.total 
                    ? "Perfect score! 🎉" 
                    : score.correct >= score.total / 2 
                      ? "Good job! Keep practicing." 
                      : "Keep studying and try again!"}
                </p>
                
                {/* Review Mode Toggle - Premium only */}
                <div className="flex items-center justify-center gap-3 p-3 bg-card/50 rounded-lg">
                  {isPremium ? (
                    <>
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor="review-mode" className="text-sm">Review Mode</Label>
                      <Switch
                        id="review-mode"
                        checked={reviewMode}
                        onCheckedChange={setReviewMode}
                      />
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Lock className="w-4 h-4" />
                      <span className="text-sm">Review Mode (Premium only)</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Quiz UI */}
          <AnimatePresence mode="wait">
            {quizResult && quizResult.length > 0 && !reviewMode && (
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
                      const isCorrect = isCorrectAnswer(currentQuestion, option);
                      const showCorrectFeedback = isSelected && isCorrect && !submitted;
                      
                      return (
                        <motion.button
                          key={idx}
                          onClick={() => handleSelectOption(currentQuestion, option)}
                          disabled={submitted}
                          whileHover={!submitted ? { scale: 1.01 } : {}}
                          whileTap={!submitted ? { scale: 0.99 } : {}}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border transition-all",
                            submitted && isCorrect
                              ? "bg-green-500/10 border-green-500 text-foreground"
                              : submitted && isSelected && !isCorrect
                                ? "bg-destructive/10 border-destructive text-foreground"
                                : isSelected
                                  ? "bg-primary/10 border-primary text-foreground"
                                  : "bg-card border-border hover:border-primary/50 text-foreground",
                            submitted && "cursor-default"
                          )}
                        >
                          <span className="font-medium">{option}</span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Show explanation if user selected correct answer (during quiz) */}
                  {selectedAnswers[currentQuestion] && 
                   isCorrectAnswer(currentQuestion, selectedAnswers[currentQuestion]) && 
                   !submitted && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                    >
                      <p className="text-sm text-green-400 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{quizResult[currentQuestion].explanation}</span>
                      </p>
                    </motion.div>
                  )}
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
                  {currentQuestion === quizResult.length - 1 ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={!allQuestionsAnswered || submitted}
                      className="flex-1"
                      variant="neon"
                    >
                      {submitted ? "Submitted ✓" : "Submit"}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNextQuestion}
                      className="flex-1"
                    >
                      Next
                    </Button>
                  )}
                </div>

                {/* Answered count */}
                {!submitted && (
                  <p className="text-center text-sm text-muted-foreground">
                    {Object.keys(selectedAnswers).length} of {quizResult.length} questions answered
                  </p>
                )}
              </motion.div>
            )}

            {/* Review Mode - Full review with all answers */}
            {reviewMode && quizResult && (
              <motion.div
                key="review-mode"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-heading font-bold flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Review Mode
                  </h2>
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

                {quizResult.map((q, idx) => {
                  const userAnswer = selectedAnswers[idx];
                  const isCorrect = userAnswer && isCorrectAnswer(idx, userAnswer);
                  
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-card border border-border rounded-xl p-6"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <span className="text-sm font-medium text-muted-foreground">
                          Q{idx + 1}
                        </span>
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive shrink-0" />
                        )}
                      </div>
                      
                      <h3 className="font-medium mb-4">{q.question}</h3>

                      <div className="space-y-2 mb-4">
                        {q.options.map((option, optIdx) => {
                          const isCorrectOption = getOptionLetter(option) === q.answer;
                          const isUserSelection = userAnswer === option;
                          
                          return (
                            <div
                              key={optIdx}
                              className={cn(
                                "p-3 rounded-lg border text-sm",
                                isCorrectOption
                                  ? "bg-green-500/10 border-green-500/50 text-foreground"
                                  : isUserSelection
                                    ? "bg-destructive/10 border-destructive/50 text-foreground"
                                    : "bg-muted/30 border-border text-muted-foreground"
                              )}
                            >
                              {option}
                              {isCorrectOption && (
                                <span className="ml-2 text-green-500 text-xs">✓ Correct</span>
                              )}
                              {isUserSelection && !isCorrectOption && (
                                <span className="ml-2 text-destructive text-xs">Your answer</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-primary">Explanation:</span>{" "}
                          {q.explanation}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
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
