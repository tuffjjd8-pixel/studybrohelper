import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Trophy } from "lucide-react";
import { toast } from "sonner";
import { ConfettiCelebration } from "@/components/layout/ConfettiCelebration";

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchSolveAndGenerateQuiz();
    }
  }, [user, id]);

  const fetchSolveAndGenerateQuiz = async () => {
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
      await generateQuiz(data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load");
      navigate("/history");
    }
  };

  const generateQuiz = async (solveData: Solve) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          subject: solveData.subject,
          question: solveData.question_text,
          solution: solveData.solution_markdown,
        },
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
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const finalScore = isComplete
    ? score + (selectedAnswer === questions[currentIndex]?.correctIndex ? 1 : 0)
    : score;

  return (
    <div className="min-h-screen bg-background">
      <Header streak={0} totalSolves={0} />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate(`/solve/${id}`)}
            className="text-sm text-muted-foreground hover:text-foreground mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Solution
          </button>

          {generating ? (
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
                Creating questions based on your problem
              </p>
            </motion.div>
          ) : isComplete ? (
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
                  ? "Perfect score! You're a genius, bro! 🎉"
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
          ) : currentQuestion ? (
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
          ) : null}
        </div>
      </main>

      <BottomNav />
      <ConfettiCelebration show={showConfetti} onComplete={() => setShowConfetti(false)} />
    </div>
  );
};

export default Quiz;
