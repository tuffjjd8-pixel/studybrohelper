import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, FONT } from "../styles";

// Scene 2: Reveal — "…until I found THIS" (70 frames)
export const Scene2CameraSnap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Text
  const textOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 200 } }),
    [0, 1], [40, 0]
  );

  // "THIS" emphasis
  const thisScale = spring({ frame: frame - 8, fps, config: { damping: 8, stiffness: 250 } });

  // App UI zooms in big from behind
  const uiDelay = 15;
  const uiScale = interpolate(
    spring({ frame: frame - uiDelay, fps, config: { damping: 14, stiffness: 120 } }),
    [0, 1], [0.3, 1]
  );
  const uiOpacity = interpolate(frame, [uiDelay, uiDelay + 8], [0, 1], { extrapolateRight: "clamp" });

  // Flash burst on "THIS"
  const flashOpacity = frame >= 12 && frame <= 20
    ? interpolate(frame, [12, 15, 20], [0, 0.8, 0], { extrapolateRight: "clamp" })
    : 0;

  // Green glow ring expanding
  const ringScale = spring({ frame: frame - 18, fps, config: { damping: 12, stiffness: 60 } });
  const ringOpacity = interpolate(frame, [18, 28, 60], [0, 0.5, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Subtle grid */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.025,
        backgroundImage: `linear-gradient(${COLORS.green} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.green} 1px, transparent 1px)`,
        backgroundSize: "50px 50px",
      }} />

      {/* Text overlay at top */}
      <div style={{
        position: "absolute", top: 200,
        width: "100%", textAlign: "center",
        opacity: textOpacity,
        transform: `translateY(${textY}px)`,
        zIndex: 10,
      }}>
        <div style={{ fontSize: 50, fontWeight: 700, color: COLORS.gray, fontFamily: FONT.heading }}>
          …until I found
        </div>
        <div style={{
          fontSize: 90, fontWeight: 900, color: COLORS.green,
          marginTop: 8, fontFamily: FONT.heading,
          transform: `scale(${thisScale})`, display: "inline-block",
          textShadow: `0 0 40px ${COLORS.greenGlowStrong}`,
        }}>
          THIS
        </div>
      </div>

      {/* App UI — LARGE, filling most of the screen */}
      <div style={{
        position: "absolute", left: "50%", top: "55%",
        transform: `translate(-50%, -45%) scale(${uiScale})`,
        opacity: uiOpacity, width: 920, height: 1500,
      }}>
        {/* Green glow ring behind */}
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          width: 960, height: 1540, borderRadius: 44,
          border: `3px solid ${COLORS.green}`,
          opacity: ringOpacity,
          boxShadow: `0 0 60px ${COLORS.green}`,
        }} />
        {/* Full-screen UI */}
        <div style={{
          width: "100%", height: "100%", borderRadius: 36,
          overflow: "hidden",
          border: `2px solid ${COLORS.border}`,
          boxShadow: `0 0 80px ${COLORS.greenGlow}, 0 30px 60px rgba(0,0,0,0.7)`,
        }}>
          <Img src={staticFile("images/home.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </div>

      {/* Flash burst */}
      <div style={{
        position: "absolute", inset: 0,
        background: COLORS.green,
        opacity: flashOpacity,
      }} />
    </AbsoluteFill>
  );
};
