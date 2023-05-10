// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import React from "react";

import { Layer } from "react-konva";
import { Block, blockHeight } from "../components/animations/block";
import { useDerived as useLinearSpring } from "../components/animations/hooks";
import { Animated } from "../components/animations/a";
import { AnimatedCanvas } from "../components/animations/canvas";
import { TextArrow } from "../components/animations/textarrow";

export function CastleBuilding() {
  return (
    <AnimatedCanvas
      canvasHeight={300}
      canvasWidth={500}
      height={300}
      start={0.75}
      end={0.25}
      slowMotion={0.3}
      scene={(progress) => {
        const topMargin = 50;
        const blockMargin = 40;
        const size = 40;
        const fadeOut = useLinearSpring(progress, [0.0, 0.1], [1, 0]);
        const moveBottom = useLinearSpring(
          progress,
          [0.1, 0.3],
          [0, blockMargin]
        );
        const moveUp = useLinearSpring(progress, [0.1, 0.3], [0, -blockMargin]);
        const shiftLeft = useLinearSpring(progress, [0.3, 0.5], [0, -200]);
        const planFadeIn = useLinearSpring(progress, [0.6, 0.7], [0, 1]);

        const fadeIn = useLinearSpring(progress, [0.7, 1], [0, 1]);
        const moveBottom2 = useLinearSpring(
          progress,
          [0.7, 1],
          [0, blockMargin]
        );
        const moveUp2 = useLinearSpring(progress, [0.7, 1], [0, -blockMargin]);
        const fadeIn2 = useLinearSpring(progress, [0.7, 1], [0, 1]);

        return (
          <Layer>
            <Animated opacity={fadeOut}>
              <TextArrow
                p={[
                  100,
                  topMargin + blockMargin * 0 + blockHeight(size, 2) * 0,
                ]}
                text="your frontend"
                size={20}
                arrow={[
                  300 - size - 10,
                  topMargin + blockMargin * 0 + blockHeight(size, 2) * 0,
                ]}
              />
            </Animated>
            <Animated opacity={fadeOut}>
              <TextArrow
                p={[
                  100,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                text="your backend"
                size={20}
                arrow={[
                  300 - size - 10,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
              />
            </Animated>
            <Animated opacity={fadeOut}>
              <TextArrow
                p={[
                  100,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2,
                ]}
                text="your database"
                size={20}
                arrow={[
                  300 - size - 10,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2,
                ]}
              />
            </Animated>

            <Animated opacity={planFadeIn}>
              <TextArrow
                p={[
                  100,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2 + 20,
                ]}
                text="expectations"
                size={20}
              />
            </Animated>

            <Animated x={shiftLeft} y={moveBottom}>
              <Block
                p={[
                  300,
                  topMargin + blockMargin * 0 + blockHeight(size, 2) * 0,
                ]}
                color="blue"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>
            <Animated x={shiftLeft}>
              <Block
                p={[
                  300,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                color="gray"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>
            <Animated x={shiftLeft} y={moveUp}>
              <Block
                p={[
                  300,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2,
                ]}
                color="orange"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>

            <Animated opacity={fadeIn} y={moveBottom2}>
              <Block
                p={[
                  350,
                  topMargin + blockMargin * 0 + blockHeight(size, 2) * 0,
                ]}
                color="blue"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>
            <Animated opacity={fadeIn}>
              <Block
                p={[
                  350 + 10,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                color="gray"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>
            <Animated opacity={fadeIn} y={moveUp2}>
              <Block
                p={[
                  350 - 10,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2,
                ]}
                color="orange"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>

            <Animated opacity={fadeIn2}>
              <TextArrow
                p={[
                  350,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2 + 20,
                ]}
                text="reality"
                size={20}
              />
            </Animated>
          </Layer>
        );
      }}
    />
  );
}
