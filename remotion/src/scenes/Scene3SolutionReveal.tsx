import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../styles";

// Scene 3: Solution reveal - "Solved. Instantly." (0:04-0:07 = 90 frames)
export const Scene3SolutionReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Solution steps cascade in
  const steps = [
    "Step 1: Identify the equation type",
    "Step 2: Apply the quadratic formula",
    "Step 3: Calculate discriminant",
    "Step 4: x = 3 or x = -1 ✓",
  ];

  // "Solved. Instantly." text
  const solvedScale = spring({ frame: frame - 60, fps, config: { damping: 12, stiffness: 200 } });
  const solvedOpacity = interpolate(frame, [60, 68], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Green radial glow */}
      <div style={{
        position: "absolute", left: "50%", top: "40%",
        transform: "translate(-50%, -50%)",
        width: 800, height: 800, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(163,230,53,0.08) 0%, transparent 70%)",
      }} />

      {/* Solution card */}
      <div style={{
        position: "absolute", top: 250, left: 60, right: 60,
        background: COLORS.bgCard,
        borderRadius: 24,
        border: `1px solid ${COLORS.border}`,
        padding: 40,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{
          fontSize: 28, fontWeight: 600, color: COLORS.green,
          marginBottom: 30,
          opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          ✨ Solution
        </div>

        {/* Steps */}
        {steps.map((step, i) => {
          const delay = i * 12 + 5;
          const stepSpring = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 180 } });
          const stepOpacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateRight: "clamp" });
          const stepX = interpolate(stepSpring, [0, 1], [-40, 0]);
          const isLast = i === steps.length - 1;

          return (
            <div key={i} style={{
              opacity: stepOpacity,
              transform: `translateX(${stepX}px)`,
              marginBottom: 24,
              padding: "16px 20px",
              borderRadius: 12,
              background: isLast ? "rgba(163,230,53,0.1)" : "rgba(255,255,255,0.03)",
              border: isLast ? `1px solid ${COLORS.green}` : `1px solid ${COLORS.border}`,
            }}>
              <div style={{
                fontSize: 30,
                fontWeight: isLast ? 700 : 400,
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
        position: "absolute", bottom: 350,
        width: "100%", textAlign: "center",
        opacity: solvedOpacity,
        transform: `scale(${solvedScale})`,
      }}>
        <div style={{ fontSize: 72, fontWeight: 900, color: COLORS.white }}>
          Solved.{" "}
          <span style={{ color: COLORS.green }}>Instantly.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
