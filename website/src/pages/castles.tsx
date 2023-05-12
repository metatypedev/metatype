// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import React from "react";

import { Image, Layer } from "react-konva";
import { Block, blockHeight } from "../components/animations/block";
import { useLinearSpring } from "../components/animations/hooks";
import { Animated } from "../components/animations/animated";
import { AnimatedCanvas } from "../components/animations/canvas";
import { TextArrow } from "../components/animations/textarrow";
import useImage from "use-image";
import { DoubleArrow } from "../components/animations/doublearrow";

export function BuildingCastle() {
  return (
    <AnimatedCanvas
      canvasHeight={300}
      canvasWidth={500}
      height={300}
      before={20}
      after={20}
      slowMotion={1}
      scene={(progress) => {
        const topMargin = 55;
        const blockMargin = 40;
        const size = 40;

        const col1 = 120;
        const col2 = 310;

        const oneFadeOut = useLinearSpring(progress, [0.0, 0.25], [1, 0]);

        const twoMoveDown = useLinearSpring(
          progress,
          [0.25, 0.5],
          [0, blockMargin]
        );
        const twoMoveUp = useLinearSpring(
          progress,
          [0.25, 0.5],
          [0, -blockMargin]
        );

        const threeMoveLeft = useLinearSpring(
          progress,
          [0.5, 0.75],
          [0, col1 - col2]
        );
        const threeFadeIn = useLinearSpring(progress, [0.5, 0.75], [0, 1]);

        const fourFadeIn = useLinearSpring(progress, [0.75, 1], [0, 1]);
        const fourModeDown = useLinearSpring(
          progress,
          [0.75, 1],
          [0, blockMargin]
        );
        const fourMoveUp = useLinearSpring(
          progress,
          [0.75, 1],
          [0, -blockMargin]
        );

        return (
          <Layer>
            <Animated opacity={oneFadeOut}>
              <TextArrow
                p={[
                  col1,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2,
                ]}
                text="your database"
                size={20}
                arrows={[
                  [
                    col2 - size - 10,
                    topMargin + blockMargin * 2 + blockHeight(size, 2) * 2,
                  ],
                ]}
              />
            </Animated>
            <Animated opacity={oneFadeOut}>
              <TextArrow
                p={[
                  col1,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                text="your backend"
                size={20}
                arrows={[
                  [
                    col2 - size - 10,
                    topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                  ],
                ]}
              />
            </Animated>
            <Animated opacity={oneFadeOut}>
              <TextArrow
                p={[
                  col1,
                  topMargin + blockMargin * 0 + blockHeight(size, 2) * 0,
                ]}
                text="your frontend"
                size={20}
                arrows={[
                  [
                    col2 - size - 10,
                    topMargin + blockMargin * 0 + blockHeight(size, 2) * 0,
                  ],
                ]}
              />
            </Animated>

            <Animated x={threeMoveLeft} opacity={threeFadeIn}>
              <TextArrow
                p={[
                  col2,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2 + 20,
                ]}
                text="expectations"
                size={20}
              />
            </Animated>

            <Animated x={threeMoveLeft} y={twoMoveUp}>
              <Block
                p={[
                  col2,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2,
                ]}
                color="orange"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>
            <Animated x={threeMoveLeft}>
              <Block
                p={[
                  col2,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                color="gray"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>
            <Animated x={threeMoveLeft} y={twoMoveDown}>
              <Block
                p={[
                  col2,
                  topMargin + blockMargin * 0 + blockHeight(size, 2) * 0,
                ]}
                color="blue"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>

            <Animated opacity={fourFadeIn} y={fourMoveUp}>
              <Block
                p={[
                  col2 - 10,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2,
                ]}
                color="orange"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>
            <Animated opacity={fourFadeIn}>
              <Block
                p={[
                  col2 + 10,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                color="gray"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>
            <Animated opacity={fourFadeIn} y={fourModeDown}>
              <Block
                p={[
                  col2,
                  topMargin + blockMargin * 0 + blockHeight(size, 2) * 0,
                ]}
                color="blue"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>

            <Animated opacity={fourFadeIn}>
              <TextArrow
                p={[
                  col2,
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

export function StableCastle() {
  return (
    <AnimatedCanvas
      canvasHeight={300}
      canvasWidth={500}
      height={300}
      before={20}
      after={20}
      slowMotion={1}
      scene={(progress) => {
        const topMargin = 55;
        const blockMargin = 40;
        const size = 40;

        const col1 = 100;
        const col2 = 225;
        const col3 = 350;

        const oneFadeIn = useLinearSpring(progress, [0.0, 0.25], [0, 1]);
        const oneFadeOut = useLinearSpring(progress, [0.0, 0.25], [1, 0]);

        const twoFadeOut = useLinearSpring(
          progress,
          [0.0, 0.25, 0.5],
          [0, 1, 0]
        );

        const threeMoveDown = useLinearSpring(
          progress,
          [0.5, 0.75],
          [0, blockMargin]
        );
        const threeMoveUp = useLinearSpring(
          progress,
          [0.5, 0.75],
          [0, -blockMargin]
        );

        const fourMoveLeft = useLinearSpring(
          progress,
          [0.75, 1],
          [0, col2 - col3]
        );
        const fourFadeIn = useLinearSpring(progress, [0.75, 1], [0, 1]);

        return (
          <Layer>
            <Animated opacity={oneFadeOut}>
              <Block
                p={[
                  col3,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2,
                ]}
                color="orange"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>
            <Animated opacity={oneFadeOut}>
              <Block
                p={[
                  col3,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                color="gray"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>
            <Animated opacity={oneFadeOut}>
              <Block
                p={[
                  col3,
                  topMargin + blockMargin * 0 + blockHeight(size, 2) * 0,
                ]}
                color="blue"
                height={2}
                width={2}
                size={size}
                connectors={false}
              />
            </Animated>

            <Animated x={fourMoveLeft} y={threeMoveUp} opacity={oneFadeIn}>
              <Block
                p={[
                  col3,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2,
                ]}
                color="orange"
                height={2}
                width={2}
                size={size}
              />
            </Animated>
            <Animated x={fourMoveLeft} opacity={oneFadeIn}>
              <Block
                p={[
                  col3,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                color="gray"
                height={2}
                width={2}
                size={size}
              />
            </Animated>
            <Animated x={fourMoveLeft} y={threeMoveDown} opacity={oneFadeIn}>
              <Block
                p={[
                  col3,
                  topMargin + blockMargin * 0 + blockHeight(size, 2) * 0,
                ]}
                color="blue"
                height={2}
                width={2}
                size={size}
              />
            </Animated>

            <Animated opacity={twoFadeOut}>
              <TextArrow
                p={[
                  col1,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 0.5 - 5,
                ]}
                text="typegraphs"
                size={20}
                arrows={[
                  [
                    col3 - size - 10,
                    topMargin + blockMargin * 0 + blockHeight(size, 2) * -0.5,
                  ],
                  [
                    col3 - size - 10,
                    topMargin +
                      blockMargin * 1 +
                      blockHeight(size, 2) * 0.5 -
                      5,
                  ],
                  [
                    col3 - size - 10,
                    topMargin +
                      blockMargin * 2 +
                      blockHeight(size, 2) * 1.5 -
                      10,
                  ],
                ]}
              />
            </Animated>

            <Animated x={fourMoveLeft} opacity={fourFadeIn}>
              <TextArrow
                p={[
                  col3,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2 + 20,
                ]}
                text="with Metatype"
                size={20}
              />
            </Animated>
          </Layer>
        );
      }}
    />
  );
}

export function ModulableCastle() {
  const [logo] = useImage("/images/logo.svg");
  return (
    <AnimatedCanvas
      canvasHeight={300}
      canvasWidth={500}
      height={300}
      before={20}
      after={20}
      slowMotion={1}
      scene={(progress) => {
        const topMargin = 55;
        const blockMargin = 40;
        const size = 40;

        const col1 = 120;
        const col3 = 380;

        const oneFadeIn = useLinearSpring(progress, [0.0, 0.25], [0, 1]);

        const twoFadeOut = useLinearSpring(
          progress,
          [0.0, 0.25, 0.5],
          [0, 1, 0]
        );

        const threeFadeIn = useLinearSpring(progress, [0.5, 0.75], [0, 1]);
        const threeFadeOut = useLinearSpring(progress, [0.5, 0.75], [1, 0]);

        const fourFadeIn = useLinearSpring(progress, [0.75, 1], [0, 1]);

        return (
          <Layer>
            <Animated opacity={threeFadeIn}>
              <Block
                p={[
                  col3 - size * 2,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 2,
                ]}
                color="purple"
                height={2}
                width={2}
                size={size}
              />
            </Animated>
            <Block
              p={[col3, topMargin + blockMargin * 1 + blockHeight(size, 2) * 2]}
              color="orange"
              height={2}
              width={2}
              size={size}
            />
            <Animated opacity={threeFadeIn}>
              <Block
                p={[
                  col3 - size / 2,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                color="gray"
                height={2}
                width={3}
                size={size}
              />
            </Animated>
            <Animated opacity={threeFadeOut}>
              <Block
                p={[
                  col3,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                color="gray"
                height={2}
                width={2}
                size={size}
              />
            </Animated>
            <Block
              p={[col3, topMargin + blockMargin * 1 + blockHeight(size, 2) * 0]}
              color="blue"
              height={2}
              width={2}
              size={size}
            />

            <Image x={col1 - 50} y={90} width={100} height={120} image={logo} />

            <Animated opacity={twoFadeOut}>
              <TextArrow
                p={[
                  col1,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2,
                ]}
                text="typegate"
                size={20}
              />
            </Animated>

            <Animated opacity={oneFadeIn}>
              <DoubleArrow points={[10, 160, col1 - 29, 160]} />
              <DoubleArrow points={[col1, 118, col1, 65, col3 - 45, 65]} />
            </Animated>
            <Animated opacity={fourFadeIn}>
              <DoubleArrow points={[col1 + 24, 160, col3 - 125, 160]} />
              <DoubleArrow
                points={[col1, 118, col1, 65, col3 - 60, 65, col3 - 60, 100]}
              />
            </Animated>
          </Layer>
        );
      }}
    />
  );
}

export function ReusableCastle() {
  return (
    <AnimatedCanvas
      canvasHeight={300}
      canvasWidth={500}
      height={300}
      before={20}
      after={20}
      slowMotion={1}
      scene={(progress) => {
        const topMargin = 60;
        const blockMargin = 40;
        const size = 40;

        const col1 = 150;

        const oneFadeIn = useLinearSpring(progress, [0.0, 0.2], [0, 1]);
        const oneFadeInOut = useLinearSpring(
          progress,
          [0.0, 0.2, 0.45],
          [0, 1, 0]
        );

        const twoFadeIn = useLinearSpring(progress, [0.25, 0.45], [0, 1]);
        const twoFadeInOut = useLinearSpring(
          progress,
          [0.25, 0.45, 0.7],
          [0, 1, 0]
        );

        const threeFadeIn = useLinearSpring(progress, [0.5, 0.7], [0, 1]);
        const threeFadeInOut = useLinearSpring(
          progress,
          [0.5, 0.7, 1],
          [0, 1, 0]
        );

        const fourFadeIn = useLinearSpring(progress, [0.75, 0.95], [0, 1]);

        return (
          <Layer>
            <Animated opacity={oneFadeIn}>
              <Block
                p={[
                  col1 + size * 3,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 2,
                ]}
                color="red"
                height={2}
                width={2}
                size={size}
              />
            </Animated>
            <Animated opacity={oneFadeInOut}>
              <TextArrow
                p={[
                  col1 + size * 3,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2 + 10,
                ]}
                text="third parties"
                size={20}
              />
            </Animated>
            <Animated opacity={twoFadeIn}>
              <Block
                p={[
                  col1 - size * 2,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 2,
                ]}
                color="purple"
                height={2}
                width={2}
                size={size}
              />
            </Animated>
            <Animated opacity={twoFadeInOut}>
              <TextArrow
                p={[
                  col1 - size * 2,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 2 + 10,
                ]}
                text="internal analytics"
                size={20}
              />
            </Animated>
            <Block
              p={[col1, topMargin + blockMargin * 1 + blockHeight(size, 2) * 2]}
              color="orange"
              height={2}
              width={2}
              size={size}
            />
            <Animated>
              <Block
                p={[
                  col1,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                color="gray"
                height={2}
                width={2}
                size={size}
              />
            </Animated>
            <Animated opacity={oneFadeIn}>
              <Block
                p={[
                  col1 + size * 1.5,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                color="gray"
                height={2}
                width={5}
                size={size}
              />
            </Animated>
            <Animated opacity={twoFadeIn}>
              <Block
                p={[
                  col1 + size * 1,
                  topMargin + blockMargin * 1 + blockHeight(size, 2) * 1,
                ]}
                color="gray"
                height={2}
                width={6}
                size={size}
              />
            </Animated>
            <Animated opacity={threeFadeIn}>
              <Block
                p={[
                  col1 + size * 2,
                  topMargin + blockMargin * 1 + blockHeight(size, 1) * 2.5,
                ]}
                color="pink"
                height={1}
                width={4}
                size={size}
              />
            </Animated>
            <Animated opacity={threeFadeIn}>
              <Block
                p={[
                  col1 + size * 1,
                  topMargin + blockMargin * 1 + blockHeight(size, 1) * 1.5,
                ]}
                color="yellow"
                height={1}
                width={2}
                size={size}
              />
            </Animated>
            <Animated opacity={threeFadeIn}>
              <Block
                p={[
                  col1 + size * 3,
                  topMargin + blockMargin * 1 + blockHeight(size, 1) * 1.5,
                ]}
                color="green"
                height={1}
                width={2}
                size={size}
              />
            </Animated>
            <Animated opacity={threeFadeInOut}>
              <TextArrow
                p={[
                  col1 + size * 6,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * 0 + 5,
                ]}
                text="chop services"
                size={20}
              />
            </Animated>
            <Animated opacity={fourFadeIn}>
              <Block
                p={[
                  col1 + size * 2.5,
                  topMargin + blockMargin * 1 + blockHeight(size, 1) * 0,
                ]}
                color="turquoise"
                height={2}
                width={1}
                size={size}
              />
            </Animated>
            <Animated opacity={fourFadeIn}>
              <TextArrow
                p={[
                  col1 + size * 5 + 5,
                  topMargin + blockMargin * 2 + blockHeight(size, 2) * -1 - 5,
                ]}
                text="back for front"
                size={20}
              />
            </Animated>
            <Block
              p={[col1, topMargin + blockMargin * 1 + blockHeight(size, 2) * 0]}
              color="blue"
              height={2}
              width={2}
              size={size}
            />
          </Layer>
        );
      }}
    />
  );
}
