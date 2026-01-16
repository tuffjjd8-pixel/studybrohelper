import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Trophy, Brain, Zap } from "lucide-react";
import { toast } from "sonner";
import { ConfettiCelebration } from "@/components/layout/ConfettiCelebration";

const QUIZ_COOLDOWN_MS = 10000; // 10 seconds between quiz generations

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
  const [lastQuizTime, setLastQuizTime] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

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

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setTimeout(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownRemaining]);

  const startQuiz = async () => {
    if (!solve) return;
    
    // Check cooldown
    const now = Date.now();
    if (now - lastQuizTime < QUIZ_COOLDOWN_MS) {
      const remaining = Math.ceil((QUIZ_COOLDOWN_MS - (now - lastQuizTime)) / 1000);
      setCooldownRemaining(remaining);
      toast.error(`Please wait ${remaining} seconds before generating another quiz`);
      return;
    }
    
    setLastQuizTime(now);
    setShowSettings(false);
    setGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          subject: solve.subject,
          question: solve.question_text,
          solution: solve.solution_markdown,
          isPremium,
        },
      });

      if (error) throw error;
      
      // Check for rate limit response
      if (data.rateLimited) {
        toast.error(data.error || "Please wait before generating another quiz");
        setShowSettings(true);
        return;
      }
      
      // Check for error with fallback questions
      if (data.error && data.questions) {
        toast.error("Quiz generation failed. Please try again or check your internet connection.");
      }
      
      setQuestions(data.questions);
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error("Quiz generation failed. Please try again or check your internet connection.");
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
                <p className="text-muted-foreground">Test your understanding of the solution</p>
              </div>

              {/* Mode Info */}
              <div className="p-6 rounded-xl bg-card border border-border text-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium mb-2">Solution-Based Quiz</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Questions generated based on the problem and solution you studied
                </p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="text-muted-foreground">Questions:</span>
                  <span className="font-medium">{isPremium ? "10" : "5"}</span>
                </div>
                {!isPremium && (
                  <p className="text-xs text-primary mt-3">
                    Upgrade to Pro for 10 questions per quiz
                  </p>
                )}
              </div>

              {/* Model Info */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Zap className="w-3 h-3" />
                <span>Powered by Groq llama-3.1-70B for high-accuracy, stable generation</span>
              </div>

              {/* Start Button */}
              <Button
                onClick={startQuiz}
                disabled={cooldownRemaining > 0}
                variant="neon"
                size="lg"
                className="w-full"
              >
                {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : "Start Quiz"}
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
                Creating {isPremium ? "10" : "5"} questions for you
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
