import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS } from "../styles";

// Scene 4: Speed montage — quick UI shots (0:07-0:10 = 90 frames)
export const Scene4SpeedMontage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const screens = [
    { img: "images/home.png", label: "Snap" },
    { img: "images/quiz.png", label: "Quiz" },
    { img: "images/history.png", label: "Track" },
  ];

  // Each screen shows for ~25 frames with whip transition
  const currentIndex = Math.min(Math.floor(frame / 28), 2);

  // "Any subject. Any question." text
  const textOpacity = interpolate(frame, [5, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Background diagonal stripes */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        background: `repeating-linear-gradient(45deg, ${COLORS.green}, ${COLORS.green} 2px, transparent 2px, transparent 40px)`,
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 150,
        width: "100%", textAlign: "center",
        opacity: textOpacity,
      }}>
        <div style={{ fontSize: 52, fontWeight: 800, color: COLORS.white }}>
          Any subject.
        </div>
        <div style={{ fontSize: 52, fontWeight: 800, color: COLORS.green }}>
          Any question.
        </div>
      </div>

      {/* Phone screens with whip-pan effect */}
      {screens.map((screen, i) => {
        const startFrame = i * 28;
        const isActive = frame >= startFrame && frame < startFrame + 28;
        const localFrame = frame - startFrame;

        // Slide in from right, slide out to left
        const x = isActive
          ? interpolate(localFrame, [0, 6, 22, 28], [500, 0, 0, -500], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
          : 1200;

        const opacity = isActive
          ? interpolate(localFrame, [0, 4, 24, 28], [0, 1, 1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
          : 0;

        const scale = isActive
          ? spring({ frame: localFrame, fps, config: { damping: 20, stiffness: 200 } }) * 0.15 + 0.85
          : 0.85;

        return (
          <div key={i} style={{
            position: "absolute",
            left: "50%",
            top: "48%",
            transform: `translate(-50%, -50%) translateX(${x}px) scale(${scale})`,
            opacity,
          }}>
            <div style={{
              width: 320, height: 660,
              borderRadius: 36,
              border: `3px solid ${COLORS.border}`,
              overflow: "hidden",
              boxShadow: `0 0 40px rgba(163,230,53,0.1), 0 20px 60px rgba(0,0,0,0.6)`,
            }}>
              <Img src={staticFile(screen.img)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            {/* Label */}
            <div style={{
              textAlign: "center", marginTop: 24,
              fontSize: 36, fontWeight: 700, color: COLORS.green,
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
