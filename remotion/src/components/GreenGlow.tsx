import { useCurrentFrame, interpolate } from "remotion";

export const GreenGlow: React.FC<{
  x: number;
  y: number;
  size?: number;
  delay?: number;
}> = ({ x, y, size = 300, delay = 0 }) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin((frame - delay) * 0.05) * 0.3 + 0.7;
  const opacity = interpolate(frame, [delay, delay + 20], [0, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(163,230,53,0.4) 0%, transparent 70%)",
        opacity: opacity * pulse,
        pointerEvents: "none",
      }}
    />
  );
};
