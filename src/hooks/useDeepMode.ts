import { useState, useEffect } from "react";

export type DeepTextColor = "gold" | "sky" | "purple" | "mint" | "rose" | "orange";

export function useDeepMode() {
  const [solveMode, setSolveModeState] = useState<"instant" | "deep">(() => {
    const saved = localStorage.getItem("solve_mode");
    return saved === "deep" ? "deep" : "instant";
  });

  const [textColor, setTextColorState] = useState<DeepTextColor>(() => {
    const saved = localStorage.getItem("deep_text_color");
    return (saved as DeepTextColor) || "gold";
  });

  useEffect(() => {
    localStorage.setItem("solve_mode", solveMode);
  }, [solveMode]);

  useEffect(() => {
    localStorage.setItem("deep_text_color", textColor);
  }, [textColor]);

  const isDeepMode = solveMode === "deep";
  const isInstantMode = solveMode === "instant";

  return {
    solveMode,
    setSolveMode: setSolveModeState,
    textColor,
    setTextColor: setTextColorState,
    isDeepMode,
    isInstantMode,
  };
}
