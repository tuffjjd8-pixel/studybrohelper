import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS, FONT } from "../styles";

// Scene 4: Speed montage — FULL-SCREEN fast cuts (110 frames)
export const Scene4SpeedMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const screens = [
    { img: "images/home.png", label: "Snap" },
    { img: "images/quiz.png", label: "Quiz" },
    { img: "images/history.png", label: "Track" },
  ];

  // Title
  const titleOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Diagonal accent stripes */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.02,
        background: `repeating-linear-gradient(45deg, ${COLORS.green}, ${COLORS.green} 1px, transparent 1px, transparent 50px)`,
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 100, width: "100%", textAlign: "center",
        opacity: titleOpacity, zIndex: 10,
      }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: COLORS.white, fontFamily: FONT.heading }}>
          Any subject.
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: COLORS.green, fontFamily: FONT.heading }}>
          Any question.
        </div>
      </div>

      {/* Full-screen UI shots — fast whip transitions */}
      {screens.map((screen, i) => {
        const startFrame = i * 34;
        const isActive = frame >= startFrame && frame < startFrame + 34;
        const localFrame = frame - startFrame;

        const x = isActive
          ? interpolate(localFrame, [0, 5, 28, 34], [800, 0, 0, -800], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
          : 2000;

        const opacity = isActive
          ? interpolate(localFrame, [0, 4, 28, 34], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
          : 0;

        const scale = isActive
          ? spring({ frame: localFrame, fps, config: { damping: 20, stiffness: 200 } }) * 0.08 + 0.92
          : 0.9;

        return (
          <div key={i} style={{
            position: "absolute", left: "50%", top: "52%",
            transform: `translate(-50%, -50%) translateX(${x}px) scale(${scale})`,
            opacity, width: 940, height: 1500,
          }}>
            <div style={{
              width: "100%", height: "100%",
              borderRadius: 32, overflow: "hidden",
              border: `2px solid ${COLORS.border}`,
              boxShadow: `0 0 50px ${COLORS.greenGlow}, 0 20px 60px rgba(0,0,0,0.6)`,
            }}>
              <Img src={staticFile(screen.img)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            {/* Label */}
            <div style={{
              textAlign: "center", marginTop: 20,
              fontSize: 44, fontWeight: 800, color: COLORS.green,
              fontFamily: FONT.heading,
              textShadow: `0 0 20px ${COLORS.greenGlowStrong}`,
              opacity: isActive ? interpolate(localFrame, [3, 10], [0, 1], { extrapolateRight: "clamp" }) : 0,
            }}>
              {screen.label}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
