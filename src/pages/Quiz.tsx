import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Trophy, Zap, Brain, Flame, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ConfettiCelebration } from "@/components/layout/ConfettiCelebration";
import { Textarea } from "@/components/ui/textarea";

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Solve {
  id: string;
  subject: string;
  question_text: string | null;
  solution_markdown: string;
}

type Difficulty = "easy" | "medium" | "hard";
type QuizMode = "standard" | "pattern";

const difficultyConfig = {
  easy: { icon: Zap, color: "text-green-500", bg: "bg-green-500/20", label: "Easy" },
  medium: { icon: Brain, color: "text-yellow-500", bg: "bg-yellow-500/20", label: "Medium" },
  hard: { icon: Flame, color: "text-red-500", bg: "bg-red-500/20", label: "Hard" },
};

const Quiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [solve, setSolve] = useState<Solve | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  
  // Test mode selection
  const [showSettings, setShowSettings] = useState(true);
  const [quizMode, setQuizMode] = useState<QuizMode>("standard");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [patternExample, setPatternExample] = useState("");

  useEffect(() => {
    if (!authLoading) {
      if (user && id) {
        fetchSolve();
        fetchPremiumStatus();
      } else if (!user && id) {
        loadGuestSolve();
      }
    }
  }, [user, authLoading, id]);

  const fetchPremiumStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsPremium(data?.is_premium ?? false);
    } catch (error) {
      console.error("Error fetching premium status:", error);
    }
  };

  const loadGuestSolve = () => {
    try {
      const guestSolves = localStorage.getItem("guest_solves");
      if (guestSolves) {
        const solves = JSON.parse(guestSolves);
        const found = solves.find((s: Solve) => s.id === id);
        if (found) {
          setSolve(found);
          setLoading(false);
        } else {
          toast.error("Solve not found");
          navigate("/history");
        }
      } else {
        toast.error("Solve not found");
        navigate("/history");
      }
    } catch (error) {
      console.error("Error loading guest solve:", error);
      navigate("/history");
    }
  };

  const fetchSolve = async () => {
    try {
      const { data, error } = await supabase
        .from("solves")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Solve not found");
        navigate("/history");
        return;
      }

      setSolve(data);
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load");
      navigate("/history");
    }
  };

  const startQuiz = async () => {
    if (!solve) return;
    
    // For pattern mode, require pattern example and Pro; for standard mode, require difficulty
    if (quizMode === "pattern") {
      if (!isPremium) {
        toast.error("Pattern Mode is a Pro feature");
        return;
      }
      if (!patternExample.trim()) {
        toast.error("Please enter a pattern example");
        return;
      }
    }
    if (quizMode === "standard" && !difficulty) {
      toast.error("Please select a difficulty");
      return;
    }
    
    setShowSettings(false);
    setGenerating(true);
    
    try {
      const body = quizMode === "pattern" 
        ? {
            mode: "pattern",
            patternExample: patternExample.trim(),
            subject: solve.subject,
            isPremium,
          }
        : {
            mode: "standard",
            subject: solve.subject,
            question: solve.question_text,
            solution: solve.solution_markdown,
            difficulty,
            isPremium,
          };

      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body,
      });

      if (error) throw error;
      setQuestions(data.questions);
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Failed to generate quiz");
      // Fallback questions
      setQuestions([
        {
          question: "Did you understand the solution?",
          options: ["Yes, completely!", "Mostly", "Need more practice", "Not really"],
          correctIndex: 0,
          explanation: "Great! Understanding is the first step to mastery.",
        },
      ]);
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
    setIsAnswered(true);
    if (index === questions[currentIndex].correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsComplete(true);
      if (score + (selectedAnswer === questions[currentIndex].correctIndex ? 1 : 0) >= questions.length * 0.7) {
        setShowConfetti(true);
      }
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setIsComplete(false);
    setShowSettings(true);
    setQuizMode("standard");
    setDifficulty(null);
    setPatternExample("");
    setQuestions([]);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const finalScore = score;

  return (
    <div className="min-h-screen bg-background">
      {/* Clean header for Quiz - no streak/solved/Pro */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => navigate(`/solve/${id}`)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-lg font-heading font-bold">Test Mode</h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-lg mx-auto">

          {/* Settings Screen */}
          {showSettings && !generating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h2 className="text-2xl font-heading font-bold mb-2">Test Mode</h2>
                <p className="text-muted-foreground">Choose your quiz mode and settings</p>
              </div>

              {/* Mode Selection */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Quiz Mode
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    onClick={() => setQuizMode("standard")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                      ${quizMode === "standard" 
                        ? "bg-primary/20 border-primary text-primary" 
                        : "bg-card border-border hover:border-muted-foreground"
                      }
                    `}
                  >
                    <Brain className={`w-6 h-6 ${quizMode === "standard" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">Standard</span>
                    <span className="text-xs text-muted-foreground text-center">Based on solution</span>
                  </motion.button>
                  <motion.button
                    onClick={() => isPremium && setQuizMode("pattern")}
                    whileHover={{ scale: isPremium ? 1.02 : 1 }}
                    whileTap={{ scale: isPremium ? 0.98 : 1 }}
                    className={`
                      p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 relative
                      ${!isPremium ? "opacity-60 cursor-not-allowed" : ""}
                      ${quizMode === "pattern" 
                        ? "bg-purple-500/20 border-purple-500 text-purple-500" 
                        : "bg-card border-border hover:border-muted-foreground"
                      }
                    `}
                  >
                    {!isPremium && (
                      <span className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        PRO
                      </span>
                    )}
                    <Sparkles className={`w-6 h-6 ${quizMode === "pattern" ? "text-purple-500" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium">Pattern</span>
                    <span className="text-xs text-muted-foreground text-center">From example</span>
                  </motion.button>
                </div>
              </div>

              {/* Pattern Example Input (only for pattern mode) */}
              {quizMode === "pattern" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Pattern Example
                  </h3>
                  <Textarea
                    placeholder="Enter your pattern example, e.g., '2 + 3 = 10' or '8 × 4 = 96'"
                    value={patternExample}
                    onChange={(e) => setPatternExample(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Enter a single example with numbers and the result. The AI will detect the pattern and generate similar questions.
                  </p>
                </motion.div>
              )}

              {/* Difficulty Selection (only for standard mode) */}
              {quizMode === "standard" && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Difficulty
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.keys(difficultyConfig) as Difficulty[]).map((level) => {
                      const config = difficultyConfig[level];
                      const Icon = config.icon;
                      const isSelected = difficulty === level;
                      
                      return (
                        <motion.button
                          key={level}
                          onClick={() => setDifficulty(level)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                            ${isSelected 
                              ? `${config.bg} border-current ${config.color}` 
                              : "bg-card border-border hover:border-muted-foreground"
                            }
                          `}
                        >
                          <Icon className={`w-6 h-6 ${isSelected ? config.color : "text-muted-foreground"}`} />
                          <span className={`text-sm font-medium ${isSelected ? config.color : ""}`}>
                            {config.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tier Info */}
              <div className="p-4 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Questions generated:</span>
                  <span className="font-medium">
                    {isPremium ? (quizMode === "pattern" ? "8" : "10") : "5"} questions
                  </span>
                </div>
                {!isPremium && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Upgrade to Pro for more questions and Pattern Mode
                  </p>
                )}
              </div>

              {/* Start Button */}
              <Button
                onClick={startQuiz}
                disabled={(quizMode === "standard" && !difficulty) || (quizMode === "pattern" && (!patternExample.trim() || !isPremium))}
                variant="neon"
                size="lg"
                className="w-full"
              >
                {quizMode === "pattern" ? "Generate Pattern Quiz" : "Start Quiz"}
              </Button>
            </motion.div>
          )}

          {generating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h3 className="text-lg font-medium mb-2">Generating Quiz...</h3>
              <p className="text-muted-foreground text-sm">
                {quizMode === "pattern" 
                  ? "Analyzing pattern and creating questions"
                  : `Creating ${isPremium ? "10" : "5"} ${difficulty} questions for you`
                }
              </p>
            </motion.div>
          )}

          {!showSettings && !generating && isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-heading font-bold mb-2">Quiz Complete!</h2>
              <p className="text-4xl font-bold text-primary mb-2">
                {finalScore}/{questions.length}
              </p>
              <p className="text-muted-foreground mb-8">
                {finalScore === questions.length
                  ? "Perfect score! You're a genius! 🎉"
                  : finalScore >= questions.length * 0.7
                  ? "Great job! You've got this! 💪"
                  : "Keep practicing, you'll get it! 📚"}
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => navigate(`/solve/${id}`)}>
                  Back to Solution
                </Button>
              </div>
            </motion.div>
          )}

          {!showSettings && !generating && !isComplete && currentQuestion && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Progress */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex-1 h-2 bg-card rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${((currentIndex + 1) / questions.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {currentIndex + 1}/{questions.length}
                  </span>
                </div>

                {/* Question */}
                <div className="p-6 bg-card rounded-xl border border-border mb-6">
                  <h3 className="text-lg font-medium">{currentQuestion.question}</h3>
                </div>

                {/* Options */}
                <div className="space-y-3 mb-6">
                  {currentQuestion.options.map((option, index) => {
                    const isCorrect = index === currentQuestion.correctIndex;
                    const isSelected = index === selectedAnswer;

                    return (
                      <motion.button
                        key={index}
                        onClick={() => handleAnswer(index)}
                        disabled={isAnswered}
                        whileHover={!isAnswered ? { scale: 1.02 } : {}}
                        whileTap={!isAnswered ? { scale: 0.98 } : {}}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                          isAnswered
                            ? isCorrect
                              ? "bg-green-500/20 border-green-500"
                              : isSelected
                              ? "bg-red-500/20 border-red-500"
                              : "bg-card border-border opacity-50"
                            : "bg-card border-border hover:border-primary"
                        }`}
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            isAnswered && isCorrect
                              ? "bg-green-500 text-white"
                              : isAnswered && isSelected
                              ? "bg-red-500 text-white"
                              : "bg-muted"
                          }`}
                        >
                          {isAnswered && isCorrect ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : isAnswered && isSelected ? (
                            <XCircle className="w-5 h-5" />
                          ) : (
                            String.fromCharCode(65 + index)
                          )}
                        </span>
                        <span className="flex-1">{option}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-primary/10 rounded-xl border border-primary/20 mb-6"
                  >
                    <p className="text-sm">
                      <span className="font-medium">Explanation: </span>
                      {currentQuestion.explanation}
                    </p>
                  </motion.div>
                )}

                {/* Next button */}
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Button onClick={handleNext} className="w-full">
                      {currentIndex < questions.length - 1 ? "Next Question" : "See Results"}
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      <BottomNav />
      <ConfettiCelebration show={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
};

export default Quiz;
