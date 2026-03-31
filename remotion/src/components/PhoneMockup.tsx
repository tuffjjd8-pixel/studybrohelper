import { Img, staticFile } from "remotion";

export const PhoneMockup: React.FC<{
  screen: string;
  style?: React.CSSProperties;
}> = ({ screen, style }) => {
  return (
    <div
      style={{
        width: 340,
        height: 700,
        borderRadius: 40,
        border: "4px solid #3f3f46",
        overflow: "hidden",
        background: "#0a0a0a",
        boxShadow: "0 0 60px rgba(163,230,53,0.15), 0 20px 60px rgba(0,0,0,0.8)",
        ...style,
      }}
    >
      <Img
        src={staticFile(screen)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
};
