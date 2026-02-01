import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator as CalcIcon, Crown, Sparkles, Delete } from "lucide-react";
import { Link } from "react-router-dom";

interface Profile {
  is_premium?: boolean;
  streak_count?: number;
  total_solves?: number;
}

const Calculator = () => {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("is_premium, streak_count, total_solves")
        .eq("user_id", user.id)
        .single();
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const isPremium = profile?.is_premium === true;
  const isAuthenticated = !!user;

  const handleDigit = (digit: string) => {
    if (waitingForSecondOperand) {
      setDisplay(digit);
      setWaitingForSecondOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const handleDecimal = () => {
    if (waitingForSecondOperand) {
      setDisplay("0.");
      setWaitingForSecondOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleOperation = (op: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(display);
    } else if (operation) {
      const result = calculate(parseFloat(previousValue), inputValue, operation);
      setDisplay(String(result));
      setPreviousValue(String(result));
    }

    setWaitingForSecondOperand(true);
    setOperation(op);
  };

  const calculate = (first: number, second: number, op: string): number => {
    switch (op) {
      case "+":
        return first + second;
      case "-":
        return first - second;
      case "×":
        return first * second;
      case "÷":
        return second !== 0 ? first / second : 0;
      case "^":
        return Math.pow(first, second);
      case "%":
        return first % second;
      default:
        return second;
    }
  };

  const handleEquals = () => {
    if (!operation || previousValue === null) return;

    const inputValue = parseFloat(display);
    const result = calculate(parseFloat(previousValue), inputValue, operation);
    const historyEntry = `${previousValue} ${operation} ${display} = ${result}`;
    
    setHistory((prev) => [historyEntry, ...prev.slice(0, 9)]);
    setDisplay(String(result));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForSecondOperand(false);
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForSecondOperand(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  // Premium-only scientific functions
  const handleScientific = (func: string) => {
    if (!isPremium) return;
    
    const value = parseFloat(display);
    let result: number;

    switch (func) {
      case "sin":
        result = Math.sin((value * Math.PI) / 180);
        break;
      case "cos":
        result = Math.cos((value * Math.PI) / 180);
        break;
      case "tan":
        result = Math.tan((value * Math.PI) / 180);
        break;
      case "√":
        result = Math.sqrt(value);
        break;
      case "log":
        result = Math.log10(value);
        break;
      case "ln":
        result = Math.log(value);
        break;
      case "π":
        setDisplay(String(Math.PI));
        return;
      case "e":
        setDisplay(String(Math.E));
        return;
      case "x²":
        result = Math.pow(value, 2);
        break;
      case "1/x":
        result = 1 / value;
        break;
      case "±":
        result = -value;
        break;
      case "!":
        result = factorial(Math.floor(value));
        break;
      default:
        return;
    }

    setDisplay(String(result));
  };

  const factorial = (n: number): number => {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
  };

  const Button_ = ({ 
    onClick, 
    children, 
    variant = "default",
    disabled = false,
    className = ""
  }: {
    onClick: () => void;
    children: React.ReactNode;
    variant?: "default" | "operation" | "equals" | "scientific";
    disabled?: boolean;
    className?: string;
  }) => {
    const baseClasses = "h-14 text-lg font-medium rounded-xl transition-all active:scale-95";
    const variantClasses = {
      default: "bg-muted hover:bg-muted/80 text-foreground",
      operation: "bg-primary/20 hover:bg-primary/30 text-primary",
      equals: "bg-primary hover:bg-primary/90 text-primary-foreground",
      scientific: isPremium 
        ? "bg-secondary/20 hover:bg-secondary/30 text-secondary-foreground" 
        : "bg-muted/50 text-muted-foreground cursor-not-allowed",
    };

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${variantClasses[variant]} ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {children}
      </button>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show sign-in prompt for unauthenticated users - friendly message
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header streak={0} totalSolves={0} />
        <main className="pt-20 pb-24 px-4">
          <div className="max-w-md mx-auto text-center py-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
                <CalcIcon className="w-10 h-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-heading font-bold">Calculator</h1>
              <p className="text-muted-foreground">
                Sign in to use History, Quizzes, and Polls.
              </p>
              <Link to="/auth">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </Link>
            </motion.div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        streak={profile?.streak_count || 0} 
        totalSolves={profile?.total_solves || 0} 
        isPremium={isPremium}
      />

      <main className="pt-20 pb-24 px-4">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-heading font-bold mb-2 flex items-center gap-2">
              <CalcIcon className="w-6 h-6 text-primary" />
              Calculator
              {isPremium && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Scientific
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isPremium 
                ? "Full scientific calculator with advanced functions"
                : "Basic calculator • Upgrade for scientific functions"
              }
            </p>
          </motion.div>

          {/* Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-4 mb-4"
          >
            <div className="text-right">
              {previousValue && operation && (
                <div className="text-sm text-muted-foreground mb-1">
                  {previousValue} {operation}
                </div>
              )}
              <div className="text-4xl font-mono font-bold truncate">
                {display}
              </div>
            </div>
          </motion.div>

          {/* Scientific Functions - Premium Only */}
          {isPremium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-5 gap-2 mb-4"
            >
              <Button_ onClick={() => handleScientific("sin")} variant="scientific">sin</Button_>
              <Button_ onClick={() => handleScientific("cos")} variant="scientific">cos</Button_>
              <Button_ onClick={() => handleScientific("tan")} variant="scientific">tan</Button_>
              <Button_ onClick={() => handleScientific("log")} variant="scientific">log</Button_>
              <Button_ onClick={() => handleScientific("ln")} variant="scientific">ln</Button_>
              <Button_ onClick={() => handleScientific("√")} variant="scientific">√</Button_>
              <Button_ onClick={() => handleScientific("x²")} variant="scientific">x²</Button_>
              <Button_ onClick={() => handleOperation("^")} variant="scientific">xʸ</Button_>
              <Button_ onClick={() => handleScientific("π")} variant="scientific">π</Button_>
              <Button_ onClick={() => handleScientific("e")} variant="scientific">e</Button_>
              <Button_ onClick={() => handleScientific("1/x")} variant="scientific">1/x</Button_>
              <Button_ onClick={() => handleScientific("!")} variant="scientific">n!</Button_>
              <Button_ onClick={() => handleScientific("±")} variant="scientific">±</Button_>
              <Button_ onClick={() => handleOperation("%")} variant="scientific">mod</Button_>
              <Button_ onClick={() => {}} variant="scientific" disabled>( )</Button_>
            </motion.div>
          )}

          {/* Premium Upsell for Scientific */}
          {!isPremium && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-4"
            >
              <Link to="/premium">
                <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-xl text-sm">
                  <Crown className="w-4 h-4 text-primary" />
                  <span>Upgrade to unlock scientific functions</span>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Basic Calculator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-4 gap-2"
          >
            <Button_ onClick={handleClear} variant="operation">C</Button_>
            <Button_ onClick={handleBackspace} variant="operation">
              <Delete className="w-5 h-5 mx-auto" />
            </Button_>
            <Button_ onClick={() => handleOperation("%")} variant="operation">%</Button_>
            <Button_ onClick={() => handleOperation("÷")} variant="operation">÷</Button_>

            <Button_ onClick={() => handleDigit("7")}>7</Button_>
            <Button_ onClick={() => handleDigit("8")}>8</Button_>
            <Button_ onClick={() => handleDigit("9")}>9</Button_>
            <Button_ onClick={() => handleOperation("×")} variant="operation">×</Button_>

            <Button_ onClick={() => handleDigit("4")}>4</Button_>
            <Button_ onClick={() => handleDigit("5")}>5</Button_>
            <Button_ onClick={() => handleDigit("6")}>6</Button_>
            <Button_ onClick={() => handleOperation("-")} variant="operation">−</Button_>

            <Button_ onClick={() => handleDigit("1")}>1</Button_>
            <Button_ onClick={() => handleDigit("2")}>2</Button_>
            <Button_ onClick={() => handleDigit("3")}>3</Button_>
            <Button_ onClick={() => handleOperation("+")} variant="operation">+</Button_>

            <Button_ onClick={() => handleDigit("0")} className="col-span-2">0</Button_>
            <Button_ onClick={handleDecimal}>.</Button_>
            <Button_ onClick={handleEquals} variant="equals">=</Button_>
          </motion.div>

          {/* History - Premium Only */}
          {isPremium && history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-6"
            >
              <h3 className="text-sm font-medium text-muted-foreground mb-2">History</h3>
              <div className="bg-card border border-border rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
                {history.map((entry, i) => (
                  <div key={i} className="text-sm font-mono text-muted-foreground">
                    {entry}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Calculator;
