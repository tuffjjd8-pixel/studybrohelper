import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONT } from "../styles";

// Scene 6: Social proof (110 frames)
export const Scene6Premium: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Counter animation
  const solveCount = Math.min(
    Math.floor(interpolate(frame, [10, 60], [0, 50000], { extrapolateRight: "clamp" })),
    50000
  );

  // Rating
  const ratingOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp" });
  const ratingScale = spring({ frame: frame - 40, fps, config: { damping: 12, stiffness: 180 } });

  // Particles
  const particles = Array.from({ length: 8 }, (_, i) => ({
    x: 120 + (i * 110) % 850,
    y: 500 + (i * 170) % 1000,
    size: 2 + (i % 3) * 1.5,
    speed: 0.02 + (i % 3) * 0.01,
  }));

  // Green pulse glow behind counter
  const glowPulse = Math.sin(frame * 0.08) * 0.04 + 0.1;

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Green radial glow behind numbers */}
      <div style={{
        position: "absolute", left: "50%", top: "35%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 700, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(0,255,136,${glowPulse}) 0%, transparent 60%)`,
      }} />

      {/* Particles */}
      {particles.map((p, i) => {
        const drift = Math.sin(frame * p.speed + i) * 15;
        return (
          <div key={i} style={{
            position: "absolute", left: p.x + drift, top: p.y + Math.cos(frame * p.speed) * 12,
            width: p.size, height: p.size, borderRadius: "50%",
            background: COLORS.green,
            opacity: interpolate(frame, [5, 25], [0, 0.2], { extrapolateRight: "clamp" }),
          }} />
        );
      })}

      {/* Counter */}
      <div style={{
        position: "absolute", top: 380, width: "100%", textAlign: "center",
      }}>
        <div style={{
          fontSize: 110, fontWeight: 900, color: COLORS.green,
          fontFamily: FONT.heading,
          textShadow: `0 0 40px ${COLORS.greenGlowStrong}`,
          opacity: interpolate(frame, [5, 18], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          {solveCount.toLocaleString()}+
        </div>
        <div style={{
          fontSize: 38, fontWeight: 500, color: COLORS.gray, marginTop: 8,
          fontFamily: FONT.body,
          opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Problems Solved
        </div>

        {/* Stars */}
        <div style={{
          fontSize: 56, marginTop: 50,
          opacity: ratingOpacity,
          transform: `scale(${ratingScale})`,
        }}>
          ⭐⭐⭐⭐⭐
        </div>
      </div>

      {/* "Used by thousands" text */}
      <div style={{
        position: "absolute", bottom: 500, width: "100%", textAlign: "center",
        opacity: interpolate(frame, [65, 80], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{
          fontSize: 40, fontWeight: 600, color: COLORS.white,
          fontFamily: FONT.heading,
        }}>
          Used by{" "}
          <span style={{ color: COLORS.green }}>thousands</span>
          {" "}of students
        </div>
      </div>
    </AbsoluteFill>
  );
};
