import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONT } from "../styles";

// Scene 5: Features overlay (120 frames)
export const Scene5Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: "📸", title: "Snap homework" },
    { icon: "⚡", title: "Instant answers" },
    { icon: "📝", title: "Step-by-step solutions" },
    { icon: "🧠", title: "AI-powered" },
  ];

  // Title
  const titleScale = spring({ frame, fps, config: { damping: 15, stiffness: 180 } });

  // Particles
  const particles = Array.from({ length: 12 }, (_, i) => ({
    x: 100 + (i * 80) % 900,
    y: 300 + (i * 130) % 1400,
    size: 2 + (i % 3) * 2,
    speed: 0.015 + (i % 4) * 0.008,
  }));

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Green gradient top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 400,
        background: `linear-gradient(180deg, rgba(0,255,136,0.04) 0%, transparent 100%)`,
      }} />

      {/* Particles */}
      {particles.map((p, i) => {
        const drift = Math.sin(frame * p.speed + i * 2) * 20;
        const pOpacity = interpolate(frame, [10, 30], [0, 0.25], { extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            position: "absolute", left: p.x + drift, top: p.y + Math.cos(frame * p.speed) * 15,
            width: p.size, height: p.size, borderRadius: "50%",
            background: COLORS.green, opacity: pOpacity,
          }} />
        );
      })}

      {/* Title */}
      <div style={{
        position: "absolute", top: 220,
        width: "100%", textAlign: "center",
        transform: `scale(${titleScale})`,
      }}>
        <div style={{
          fontSize: 56, fontWeight: 900, color: COLORS.white,
          fontFamily: FONT.heading,
        }}>
          Everything you need
        </div>
      </div>

      {/* Feature cards — full width, stacked */}
      <div style={{
        position: "absolute", top: 400, left: 50, right: 50,
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        {features.map((f, i) => {
          const delay = 15 + i * 14;
          const cardSpring = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 200 } });
          const cardOpacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateRight: "clamp" });
          const cardX = interpolate(cardSpring, [0, 1], [80, 0]);

          return (
            <div key={i} style={{
              padding: "28px 32px",
              borderRadius: 20,
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `4px solid ${COLORS.green}`,
              opacity: cardOpacity,
              transform: `translateX(${cardX}px)`,
              boxShadow: `0 8px 30px rgba(0,0,0,0.3), inset 0 0 0 0 ${COLORS.greenGlow}`,
              display: "flex", alignItems: "center", gap: 20,
            }}>
              <div style={{ fontSize: 44 }}>{f.icon}</div>
              <div style={{
                fontSize: 34, fontWeight: 700, color: COLORS.white,
                fontFamily: FONT.heading,
              }}>
                {f.title}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
