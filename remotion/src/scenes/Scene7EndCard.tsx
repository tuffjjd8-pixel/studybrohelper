import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, FONT } from "../styles";

// Scene 7: End card — brain logo + CTA (220 frames)
export const Scene7EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Brain logo bounce in
  const brainScale = spring({ frame, fps, config: { damping: 8, stiffness: 120 } });
  const brainGlow = Math.sin(frame * 0.08) * 0.3 + 0.7;

  // Breathing float
  const breathe = Math.sin(frame * 0.05) * 6;

  // Logo text
  const logoDelay = 15;
  const logoSpring = spring({ frame: frame - logoDelay, fps, config: { damping: 15, stiffness: 180 } });
  const logoOpacity = interpolate(frame, [logoDelay, logoDelay + 10], [0, 1], { extrapolateRight: "clamp" });

  // Tagline
  const tagDelay = 30;
  const tagOpacity = interpolate(frame, [tagDelay, tagDelay + 12], [0, 1], { extrapolateRight: "clamp" });
  const tagScale = spring({ frame: frame - tagDelay, fps, config: { damping: 20 } });

  // Download button
  const dlDelay = 55;
  const dlSpring = spring({ frame: frame - dlDelay, fps, config: { damping: 10, stiffness: 180 } });
  const dlOpacity = interpolate(frame, [dlDelay, dlDelay + 10], [0, 1], { extrapolateRight: "clamp" });

  // Glow pulse on button
  const btnGlow = Math.sin(frame * 0.1) * 10 + 30;

  // Particles
  const particles = Array.from({ length: 24 }, (_, i) => ({
    x: 540 + Math.cos(i * 0.85) * (180 + i * 18),
    y: 700 + Math.sin(i * 1.1) * (120 + i * 14),
    size: 2 + (i % 4) * 1.5,
    speed: 0.015 + (i % 3) * 0.008,
    delay: i * 2,
  }));

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Central radial glow */}
      <div style={{
        position: "absolute", left: "50%", top: "38%",
        transform: "translate(-50%, -50%)",
        width: 800, height: 800, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(0,255,136,${brainGlow * 0.12}) 0%, transparent 65%)`,
      }} />

      {/* Floating particles */}
      {particles.map((p, i) => {
        const pOpacity = interpolate(frame, [p.delay, p.delay + 20], [0, 0.3], { extrapolateRight: "clamp" });
        const drift = Math.sin(frame * p.speed + i) * 18;
        return (
          <div key={i} style={{
            position: "absolute",
            left: p.x + drift, top: p.y + Math.cos(frame * p.speed) * 12 + breathe * 0.5,
            width: p.size, height: p.size, borderRadius: "50%",
            background: COLORS.green, opacity: pOpacity * brainGlow,
          }} />
        );
      })}

      {/* Brain logo — LARGE and dominant */}
      <div style={{
        position: "absolute", top: 440 + breathe, left: "50%",
        transform: `translateX(-50%) scale(${brainScale})`,
        width: 240, height: 240,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* Outer glow ring */}
        <div style={{
          position: "absolute", inset: -30,
          borderRadius: "50%",
          boxShadow: `0 0 ${50 + brainGlow * 40}px rgba(0,255,136,${brainGlow * 0.4}), 0 0 ${100 + brainGlow * 60}px rgba(0,255,136,${brainGlow * 0.15})`,
        }} />
        <Img
          src={staticFile("images/brain-logo.png")}
          style={{
            width: 220, height: 220, objectFit: "contain",
            filter: `drop-shadow(0 0 20px rgba(0,255,136,${brainGlow * 0.6}))`,
          }}
        />
      </div>

      {/* Logo text */}
      <div style={{
        position: "absolute", top: 730 + breathe * 0.6, width: "100%", textAlign: "center",
        opacity: logoOpacity, transform: `scale(${logoSpring})`,
      }}>
        <span style={{ fontSize: 88, fontWeight: 900, color: COLORS.white, fontFamily: FONT.heading }}>
          Study
        </span>
        <span style={{
          fontSize: 88, fontWeight: 900, color: COLORS.green, fontFamily: FONT.heading,
          textShadow: `0 0 20px ${COLORS.greenGlowStrong}`,
        }}>
          Bro
        </span>
      </div>

      {/* Tagline */}
      <div style={{
        position: "absolute", top: 860 + breathe * 0.4, width: "100%", textAlign: "center",
        opacity: tagOpacity, transform: `scale(${tagScale})`,
      }}>
        <div style={{
          fontSize: 38, fontWeight: 500, color: COLORS.gray,
          letterSpacing: 6, fontFamily: FONT.body,
        }}>
          Snap. Solve. Succeed.
        </div>
      </div>

      {/* Download button — glowing */}
      <div style={{
        position: "absolute", top: 1020 + breathe * 0.3, left: "50%",
        transform: `translateX(-50%) scale(${dlSpring})`,
        opacity: dlOpacity,
        padding: "24px 70px", borderRadius: 50,
        background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.greenDark})`,
        boxShadow: `0 0 ${btnGlow}px rgba(0,255,136,0.4), 0 8px 30px rgba(0,0,0,0.4)`,
      }}>
        <div style={{
          fontSize: 36, fontWeight: 800, color: COLORS.bg,
          fontFamily: FONT.heading,
        }}>
          Download Now
        </div>
      </div>

      {/* Bottom accent */}
      <div style={{
        position: "absolute", bottom: 350, left: "15%", right: "15%",
        height: 1,
        background: `linear-gradient(90deg, transparent, ${COLORS.green}, transparent)`,
        opacity: interpolate(frame, [70, 90], [0, 0.4], { extrapolateRight: "clamp" }),
      }} />
    </AbsoluteFill>
  );
};
