import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS, FONT } from "../styles";

// Scene 1: Hook — "i was so confused on this…" (80 frames)
export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera shake
  const shakeX = frame < 40 ? Math.sin(frame * 1.2) * 4 : 0;
  const shakeY = frame < 40 ? Math.cos(frame * 0.9) * 3 : 0;

  // Text slam in
  const textScale = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const textOpacity = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp" });

  // "confused" emphasis pulse
  const confusedScale = 1 + Math.sin(frame * 0.12) * 0.03;

  // Floating math symbols
  const symbols = [
    { text: "∫ f(x)dx", x: 80, y: 280, rot: -15, size: 52 },
    { text: "x² + 2x − 5 = 0", x: 620, y: 350, rot: 10, size: 40 },
    { text: "lim x→∞", x: 140, y: 900, rot: 0, size: 44 },
    { text: "Σ n=1", x: 700, y: 750, rot: -8, size: 48 },
    { text: "dy/dx", x: 800, y: 1200, rot: 12, size: 38 },
    { text: "∇²ψ", x: 100, y: 1400, rot: -5, size: 42 },
  ];
  const symOpacity = interpolate(frame, [0, 20], [0, 0.1], { extrapolateRight: "clamp" });

  // Red stress vignette
  const redPulse = Math.sin(frame * 0.15) * 0.3 + 0.5;

  return (
    <AbsoluteFill style={{
      background: COLORS.bg,
      transform: `translate(${shakeX}px, ${shakeY}px)`,
    }}>
      {/* Floating math symbols */}
      {symbols.map((s, i) => {
        const drift = Math.sin(frame * 0.03 + i) * 12;
        return (
          <div key={i} style={{
            position: "absolute", left: s.x, top: s.y + drift,
            opacity: symOpacity, fontSize: s.size,
            color: COLORS.gray, fontFamily: "serif",
            transform: `rotate(${s.rot}deg)`,
          }}>
            {s.text}
          </div>
        );
      })}

      {/* Red stress vignette */}
      <div style={{
        position: "absolute", inset: -20,
        background: `radial-gradient(ellipse at center, transparent 30%, rgba(220,38,38,${redPulse * 0.18}) 100%)`,
      }} />

      {/* Main text — centered, filling width */}
      <div style={{
        position: "absolute", top: "38%", left: "50%",
        transform: `translate(-50%, -50%) scale(${textScale})`,
        opacity: textOpacity, textAlign: "center", width: "88%",
      }}>
        <div style={{
          fontSize: 72, fontWeight: 800, color: COLORS.white,
          lineHeight: 1.25, fontFamily: FONT.heading,
          textShadow: "0 0 40px rgba(0,0,0,0.8)",
        }}>
          i was so{" "}
          <span style={{
            color: COLORS.red, fontSize: 82, fontWeight: 900,
            transform: `scale(${confusedScale})`, display: "inline-block",
            textShadow: `0 0 30px rgba(239,68,68,0.5)`,
          }}>
            confused
          </span>
          <br />on this…
        </div>
      </div>

      {/* Subtle dots at bottom */}
      <div style={{
        position: "absolute", bottom: 400, left: "50%",
        transform: "translateX(-50%)",
        fontSize: 60,
        opacity: interpolate(frame, [25, 45], [0, 0.6], { extrapolateRight: "clamp" }),
      }}>
        😩
      </div>
    </AbsoluteFill>
  );
};
