import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../styles";

// Scene 5: Features flash — panels slide in (0:10-0:14 = 120 frames)
export const Scene5Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: "📸", title: "Camera Solve", desc: "Snap & solve instantly" },
    { icon: "🧠", title: "Deep Mode", desc: "Better explanations" },
    { icon: "📝", title: "Quizzes", desc: "Test your knowledge" },
    { icon: "💬", title: "Follow-ups", desc: "Ask like a tutor" },
  ];

  // Title
  const titleSpring = spring({ frame, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Green gradient accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 400,
        background: "linear-gradient(180deg, rgba(163,230,53,0.06) 0%, transparent 100%)",
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 180,
        width: "100%", textAlign: "center",
        transform: `scale(${titleSpring})`,
      }}>
        <div style={{ fontSize: 58, fontWeight: 900, color: COLORS.white }}>
          Everything you need
        </div>
      </div>

      {/* Feature cards grid */}
      <div style={{
        position: "absolute", top: 380, left: 50, right: 50,
        display: "flex", flexWrap: "wrap", gap: 24,
        justifyContent: "center",
      }}>
        {features.map((f, i) => {
          const delay = 15 + i * 15;
          const cardSpring = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 180 } });
          const cardOpacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: "clamp" });
          const cardY = interpolate(cardSpring, [0, 1], [60, 0]);

          return (
            <div key={i} style={{
              width: 440,
              padding: "36px 30px",
              borderRadius: 20,
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              opacity: cardOpacity,
              transform: `translateY(${cardY}px)`,
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            }}>
              <div style={{ fontSize: 50, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.white, marginBottom: 6 }}>
                {f.title}
              </div>
              <div style={{ fontSize: 24, color: COLORS.gray }}>{f.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Bottom accent line */}
      <div style={{
        position: "absolute", bottom: 300, left: "10%", right: "10%",
        height: 2,
        background: `linear-gradient(90deg, transparent, ${COLORS.green}, transparent)`,
        opacity: interpolate(frame, [80, 100], [0, 0.5], { extrapolateRight: "clamp" }),
      }} />
    </AbsoluteFill>
  );
};
