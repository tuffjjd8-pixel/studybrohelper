import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONT } from "../styles";

// Scene 3: Core Value — Solution steps (140 frames)
export const Scene3SolutionReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const steps = [
    "Step 1: Identify the equation type",
    "Step 2: Apply the quadratic formula",
    "Step 3: Calculate the discriminant",
    "Step 4: x = 3  or  x = −1  ✓",
  ];

  // "Solved. Instantly." text
  const solvedDelay = 90;
  const solvedScale = spring({ frame: frame - solvedDelay, fps, config: { damping: 10, stiffness: 200 } });
  const solvedOpacity = interpolate(frame, [solvedDelay, solvedDelay + 8], [0, 1], { extrapolateRight: "clamp" });

  // Green radial glow
  const glowPulse = Math.sin(frame * 0.06) * 0.03 + 0.08;

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Green radial glow */}
      <div style={{
        position: "absolute", left: "50%", top: "40%",
        transform: "translate(-50%, -50%)",
        width: 900, height: 900, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(0,255,136,${glowPulse}) 0%, transparent 70%)`,
      }} />

      {/* Solution card — BIG, filling width */}
      <div style={{
        position: "absolute", top: 180, left: 40, right: 40,
        background: COLORS.bgCard,
        borderRadius: 28,
        border: `1px solid ${COLORS.border}`,
        padding: "44px 36px",
        boxShadow: `0 20px 80px rgba(0,0,0,0.6), 0 0 40px ${COLORS.greenGlow}`,
      }}>
        {/* Header */}
        <div style={{
          fontSize: 32, fontWeight: 700, color: COLORS.green,
          marginBottom: 36, fontFamily: FONT.heading,
          opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 36 }}>✨</span> Solution
        </div>

        {/* Steps — big and bold */}
        {steps.map((step, i) => {
          const delay = i * 15 + 8;
          const stepSpring = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 200 } });
          const stepOpacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateRight: "clamp" });
          const stepX = interpolate(stepSpring, [0, 1], [-60, 0]);
          const isLast = i === steps.length - 1;

          // Green highlight flash on each step
          const flashOpacity = interpolate(frame, [delay + 3, delay + 8, delay + 15], [0, 0.3, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

          return (
            <div key={i} style={{
              opacity: stepOpacity,
              transform: `translateX(${stepX}px)`,
              marginBottom: 20,
              padding: "20px 24px",
              borderRadius: 16,
              background: isLast
                ? `rgba(0,255,136,0.1)`
                : `rgba(255,255,255,0.02)`,
              border: isLast
                ? `2px solid ${COLORS.green}`
                : `1px solid ${COLORS.border}`,
              boxShadow: isLast
                ? `0 0 20px ${COLORS.greenGlow}`
                : `inset 0 0 30px rgba(0,255,136,${flashOpacity})`,
            }}>
              <div style={{
                fontSize: 32, fontFamily: FONT.body,
                fontWeight: isLast ? 800 : 500,
                color: isLast ? COLORS.green : COLORS.white,
              }}>
                {step}
              </div>
            </div>
          );
        })}
      </div>

      {/* "Solved. Instantly." */}
      <div style={{
        position: "absolute", bottom: 320,
        width: "100%", textAlign: "center",
        opacity: solvedOpacity,
        transform: `scale(${solvedScale})`,
      }}>
        <div style={{
          fontSize: 76, fontWeight: 900, color: COLORS.white,
          fontFamily: FONT.heading,
        }}>
          Solved.{" "}
          <span style={{ color: COLORS.green, textShadow: `0 0 30px ${COLORS.greenGlowStrong}` }}>
            Instantly.
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
