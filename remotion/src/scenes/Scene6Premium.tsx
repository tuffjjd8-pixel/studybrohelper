import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../styles";

// Scene 6: Premium tease + social proof (0:18-0:26 = 240 frames)
export const Scene6Premium: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Gold shimmer sweep
  const shimmerX = interpolate(frame, [0, 60], [-300, 1400], { extrapolateRight: "clamp" });

  // Counter animation
  const solveCount = Math.min(Math.floor(interpolate(frame, [30, 80], [0, 50000], { extrapolateRight: "clamp" })), 50000);
  const ratingOpacity = interpolate(frame, [50, 65], [0, 1], { extrapolateRight: "clamp" });

  // "Go Pro" text
  const proSpring = spring({ frame: frame - 90, fps, config: { damping: 10, stiffness: 150 } });
  const proOpacity = interpolate(frame, [90, 100], [0, 1], { extrapolateRight: "clamp" });

  // Feature list items
  const proFeatures = ["Unlimited Solves", "Deep Mode", "No Ads", "Priority Speed"];

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Gold gradient accent at top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 300,
        background: "linear-gradient(180deg, rgba(250,204,21,0.08) 0%, transparent 100%)",
      }} />

      {/* Shimmer */}
      <div style={{
        position: "absolute", top: 0, bottom: 0,
        left: shimmerX, width: 200,
        background: "linear-gradient(90deg, transparent, rgba(250,204,21,0.06), transparent)",
        transform: "skewX(-15deg)",
      }} />

      {/* Social proof section */}
      <div style={{
        position: "absolute", top: 200, width: "100%", textAlign: "center",
      }}>
        <div style={{
          fontSize: 100, fontWeight: 900, color: COLORS.green,
          opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          {solveCount.toLocaleString()}+
        </div>
        <div style={{
          fontSize: 36, fontWeight: 500, color: COLORS.gray, marginTop: 8,
          opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Problems Solved
        </div>

        <div style={{
          fontSize: 60, marginTop: 40, opacity: ratingOpacity,
        }}>
          ⭐⭐⭐⭐⭐
        </div>
      </div>

      {/* Go Pro card */}
      <div style={{
        position: "absolute", bottom: 350, left: 60, right: 60,
        padding: "40px",
        borderRadius: 24,
        background: "linear-gradient(135deg, rgba(250,204,21,0.1), rgba(217,119,6,0.05))",
        border: "1px solid rgba(250,204,21,0.3)",
        opacity: proOpacity,
        transform: `scale(${proSpring})`,
      }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: COLORS.gold, marginBottom: 24, textAlign: "center" }}>
          👑 Go Pro
        </div>
        {proFeatures.map((feat, i) => {
          const featDelay = 100 + i * 10;
          const featOpacity = interpolate(frame, [featDelay, featDelay + 8], [0, 1], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              fontSize: 28, color: COLORS.white, marginBottom: 12,
              opacity: featOpacity,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ color: COLORS.green }}>✓</span> {feat}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
