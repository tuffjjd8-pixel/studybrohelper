import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { COLORS } from "../styles";
import { PhoneMockup } from "../components/PhoneMockup";

// Scene 2: Camera snap - "until I found this" (0:02-0:04 = 60 frames)
export const Scene2CameraSnap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phone slides up from bottom
  const phoneY = interpolate(
    spring({ frame, fps, config: { damping: 15, stiffness: 100 } }),
    [0, 1], [400, 0]
  );
  const phoneOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  // Flash effect at frame 40 (simulating camera shutter)
  const flashOpacity = frame >= 38 && frame <= 48
    ? interpolate(frame, [38, 42, 48], [0, 1, 0], { extrapolateRight: "clamp" })
    : 0;

  // Text
  const textOpacity = interpolate(frame, [5, 15], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(
    spring({ frame: frame - 5, fps, config: { damping: 20 } }),
    [0, 1], [30, 0]
  );

  // Green ring pulse around phone
  const ringScale = spring({ frame: frame - 10, fps, config: { damping: 8, stiffness: 80 } });
  const ringOpacity = interpolate(frame, [10, 20, 55], [0, 0.6, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {/* Subtle grid pattern */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: `linear-gradient(${COLORS.green} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.green} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      {/* Text overlay */}
      <div style={{
        position: "absolute", top: 200,
        width: "100%", textAlign: "center",
        opacity: textOpacity,
        transform: `translateY(${textY}px)`,
      }}>
        <div style={{ fontSize: 52, fontWeight: 700, color: COLORS.gray }}>
          ...until I found
        </div>
        <div style={{ fontSize: 68, fontWeight: 900, color: COLORS.green, marginTop: 10 }}>
          THIS
        </div>
      </div>

      {/* Phone */}
      <div style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -40%) translateY(${phoneY}px)`,
        opacity: phoneOpacity,
      }}>
        {/* Green glow ring */}
        <div style={{
          position: "absolute",
          left: "50%", top: "50%",
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          width: 400, height: 760,
          borderRadius: 50,
          border: `3px solid ${COLORS.green}`,
          opacity: ringOpacity,
          boxShadow: `0 0 40px ${COLORS.green}`,
        }} />
        <PhoneMockup screen="images/home.png" />
      </div>

      {/* Camera flash */}
      <div style={{
        position: "absolute", inset: 0,
        background: COLORS.white,
        opacity: flashOpacity,
      }} />
    </AbsoluteFill>
  );
};
