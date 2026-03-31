import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../styles";

// Scene 1: "This problem took me 2 hours..." (0:00-0:02 = 60 frames)
export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background pulse
  const bgPulse = Math.sin(frame * 0.08) * 0.02;

  // Text entrance - dramatic slam in
  const textScale = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const textOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  // Equation floating elements
  const eq1Y = interpolate(frame, [0, 60], [1920, 1700], { extrapolateRight: "clamp" });
  const eq2Y = interpolate(frame, [5, 60], [1920, 1600], { extrapolateRight: "clamp" });
  const eq3X = interpolate(frame, [0, 60], [-200, 100], { extrapolateRight: "clamp" });
  const eqOpacity = interpolate(frame, [0, 15], [0, 0.15], { extrapolateRight: "clamp" });

  // Stress indicator - red pulse
  const redPulse = Math.sin(frame * 0.15) * 0.3 + 0.5;

  return (
    <AbsoluteFill style={{ background: `rgb(${10 + bgPulse * 100}, ${10}, ${10})` }}>
      {/* Floating math equations in background */}
      <div style={{ position: "absolute", left: eq3X, top: 300, opacity: eqOpacity, fontSize: 60, color: COLORS.gray, fontFamily: "serif", transform: "rotate(-15deg)" }}>
        ∫ f(x)dx
      </div>
      <div style={{ position: "absolute", right: 80, top: eq1Y - 1400, opacity: eqOpacity, fontSize: 48, color: COLORS.gray, fontFamily: "serif", transform: "rotate(10deg)" }}>
        x² + 2x - 5 = 0
      </div>
      <div style={{ position: "absolute", left: 120, top: eq2Y - 1100, opacity: eqOpacity, fontSize: 40, color: COLORS.gray, fontFamily: "serif" }}>
        lim x→∞
      </div>
      <div style={{ position: "absolute", right: 60, top: 700, opacity: eqOpacity * 0.7, fontSize: 52, color: COLORS.gray, fontFamily: "serif", transform: "rotate(-8deg)" }}>
        Σ n=1
      </div>

      {/* Red stress vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(220,38,38,${redPulse * 0.15}) 100%)`,
      }} />

      {/* Main text */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${textScale})`,
        opacity: textOpacity,
        textAlign: "center",
        width: "85%",
      }}>
        <div style={{
          fontSize: 72,
          fontWeight: 900,
          color: COLORS.white,
          lineHeight: 1.2,
          textShadow: "0 0 40px rgba(0,0,0,0.8)",
        }}>
          This problem took me
        </div>
        <div style={{
          fontSize: 120,
          fontWeight: 900,
          color: "#ef4444",
          marginTop: 20,
          textShadow: "0 0 60px rgba(239,68,68,0.5)",
        }}>
          2 HOURS
        </div>
      </div>

      {/* Clock emoji accent */}
      <div style={{
        position: "absolute",
        bottom: 300,
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: 80,
        opacity: interpolate(frame, [20, 35], [0, 0.8], { extrapolateRight: "clamp" }),
      }}>
        ⏰
      </div>
    </AbsoluteFill>
  );
};
