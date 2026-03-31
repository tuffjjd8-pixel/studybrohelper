import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2CameraSnap } from "./scenes/Scene2CameraSnap";
import { Scene3SolutionReveal } from "./scenes/Scene3SolutionReveal";
import { Scene4SpeedMontage } from "./scenes/Scene4SpeedMontage";
import { Scene5Features } from "./scenes/Scene5Features";
import { Scene6Premium } from "./scenes/Scene6Premium";
import { Scene7EndCard } from "./scenes/Scene7EndCard";

// 30s at 30fps = 900 frames
// Scene durations + transition overlaps calculated to hit 900 total
export const MainVideo: React.FC = () => {
  return (
    <TransitionSeries>
      {/* Scene 1: Hook — "i was so confused on this…" */}
      <TransitionSeries.Sequence durationInFrames={80}>
        <Scene1Hook />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 10 })}
      />

      {/* Scene 2: Reveal — "…until I found THIS" */}
      <TransitionSeries.Sequence durationInFrames={70}>
        <Scene2CameraSnap />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: 10 })}
      />

      {/* Scene 3: Core Value — Solution steps */}
      <TransitionSeries.Sequence durationInFrames={140}>
        <Scene3SolutionReveal />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-left" })}
        timing={linearTiming({ durationInFrames: 10 })}
      />

      {/* Scene 4: Speed montage */}
      <TransitionSeries.Sequence durationInFrames={110}>
        <Scene4SpeedMontage />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 12 })}
      />

      {/* Scene 5: Features */}
      <TransitionSeries.Sequence durationInFrames={120}>
        <Scene5Features />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={wipe({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: 10 })}
      />

      {/* Scene 6: Social proof */}
      <TransitionSeries.Sequence durationInFrames={110}>
        <Scene6Premium />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />

      {/* Scene 7: End card — brain logo + CTA */}
      <TransitionSeries.Sequence durationInFrames={240}>
        <Scene7EndCard />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
