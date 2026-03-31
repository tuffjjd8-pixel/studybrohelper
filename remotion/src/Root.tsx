import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// Total: 80+70+140+110+120+110+337 - (10+10+10+12+10+15) = 967-67 = 900
export const RemotionRoot: React.FC = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={900}
    fps={30}
    width={1080}
    height={1920}
  />
);
