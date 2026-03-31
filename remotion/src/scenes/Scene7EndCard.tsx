import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../styles";

// Scene 7: End card — logo + tagline (0:26-0:30 = 120 frames)
export const Scene7EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Brain icon bounce in
  const brainScale = spring({ frame, fps, config: { damping: 8, stiffness: 120 } });
  const brainGlow = Math.sin(frame * 0.1) * 0.3 + 0.7;

  // Logo text
  const logoSpring = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 180 } });
  const logoOpacity = interpolate(frame, [10, 20], [0, 1], { extrapolateRight: "clamp" });

  // Tagline
  const tagDelay = 25;
  const tagSpring = spring({ frame: frame - tagDelay, fps, config: { damping: 20 } });
  const tagOpacity = interpolate(frame, [tagDelay, tagDelay + 10], [0, 1], { extrapolateRight: "clamp" });

  // "Download Now"
  const dlDelay = 50;
  const dlSpring = spring({ frame: frame - dlDelay, fps, config: { damping: 12, stiffness: 200 } });
  const dlOpacity = interpolate(frame, [dlDelay, dlDelay + 10], [0, 1], { extrapolateRight: "clamp" });

  // Particle dots
  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: 540 + Math.cos(i * 1.2) * (200 + i * 15),
    y: 800 + Math.sin(i * 1.5) * (150 + i * 12),
    size: 3 + (i % 4) * 2,
    speed: 0.02 + (i % 3) * 0.01,
    delay: i * 3,
  }));

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Central radial glow */}
      <div style={{
        position: "absolute", left: "50%", top: "42%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(163,230,53,${brainGlow * 0.12}) 0%, transparent 70%)`,
      }} />

      {/* Floating particles */}
      {particles.map((p, i) => {
        const pOpacity = interpolate(frame, [p.delay, p.delay + 20], [0, 0.4], { extrapolateRight: "clamp" });
        const drift = Math.sin(frame * p.speed + i) * 15;
        return (
          <div key={i} style={{
            position: "absolute",
            left: p.x + drift, top: p.y + Math.cos(frame * p.speed) * 10,
            width: p.size, height: p.size,
            borderRadius: "50%",
            background: COLORS.green,
            opacity: pOpacity * brainGlow,
          }} />
        );
      })}

      {/* Brain icon */}
      <div style={{
        position: "absolute", top: 550, left: "50%",
        transform: `translateX(-50%) scale(${brainScale})`,
        width: 160, height: 160,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${COLORS.green}, ${COLORS.greenDark})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 ${40 + brainGlow * 30}px rgba(163,230,53,${brainGlow * 0.5})`,
      }}>
        <div style={{ fontSize: 80 }}>🧠</div>
      </div>

      {/* Logo */}
      <div style={{
        position: "absolute", top: 760, width: "100%", textAlign: "center",
        opacity: logoOpacity,
        transform: `scale(${logoSpring})`,
      }}>
        <span style={{ fontSize: 80, fontWeight: 900, color: COLORS.white }}>Study</span>
        <span style={{ fontSize: 80, fontWeight: 900, color: COLORS.green }}>Bro</span>
      </div>

      {/* Tagline */}
      <div style={{
        position: "absolute", top: 880, width: "100%", textAlign: "center",
        opacity: tagOpacity,
        transform: `scale(${tagSpring})`,
      }}>
        <div style={{ fontSize: 40, fontWeight: 500, color: COLORS.gray, letterSpacing: 4 }}>
          Snap. Solve. Succeed.
        </div>
      </div>

      {/* Download CTA */}
      <div style={{
        position: "absolute", bottom: 400, left: "50%",
        transform: `translateX(-50%) scale(${dlSpring})`,
        opacity: dlOpacity,
        padding: "20px 60px",
        borderRadius: 50,
        background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.greenDark})`,
        boxShadow: `0 0 30px rgba(163,230,53,0.3)`,
      }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: COLORS.bg }}>
          Download Now
        </div>
      </div>

      {/* Subtle bottom line */}
      <div style={{
        position: "absolute", bottom: 300, left: "20%", right: "20%",
        height: 1,
        background: `linear-gradient(90deg, transparent, ${COLORS.border}, transparent)`,
        opacity: interpolate(frame, [60, 80], [0, 0.5], { extrapolateRight: "clamp" }),
      }} />
    </AbsoluteFill>
  );
};
