import { useState, useEffect, useCallback } from "react";
import type { DeepModeEffect } from "@/components/solve/DeepModeReveal";

export function useDeepMode() {
  const [solveMode, setSolveModeState] = useState<"instant" | "deep">(() => {
    const saved = localStorage.getItem("solve_mode");
    return saved === "deep" ? "deep" : "instant";
  });

  const [deepEffect, setDeepEffectState] = useState<DeepModeEffect>(() => {
    const saved = localStorage.getItem("deep_mode_effect");
    return (saved as DeepModeEffect) || "neon";
  });

  useEffect(() => {
    localStorage.setItem("solve_mode", solveMode);
  }, [solveMode]);

  useEffect(() => {
    localStorage.setItem("deep_mode_effect", deepEffect);
  }, [deepEffect]);

  const isDeepMode = solveMode === "deep";

  return {
    solveMode,
    setSolveMode: setSolveModeState,
    deepEffect,
    setDeepEffect: setDeepEffectState,
    isDeepMode,
  };
}
