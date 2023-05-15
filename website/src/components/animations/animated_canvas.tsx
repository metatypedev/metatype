// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import React from "react";
import { Stage } from "react-konva";
import { useEffect, useRef, useState } from "react";
import { useVirtualScroll } from "./hooks";
import { SpringValue } from "@react-spring/konva";

interface ResponsiveCanvasP {
  scene: (value: SpringValue<number>) => React.ReactNode;
  height: number;
  before?: number;
  after?: number;
  slowMotion?: number;
  hiddenMarginTop?: number;
  canvasHeight: number;
  canvasWidth: number;
  className?: string;
}

export function AnimatedCanvas({
  height,
  scene,
  before = 0,
  after = 0,
  slowMotion = 1,
  canvasHeight,
  canvasWidth,
  className,
}: ResponsiveCanvasP) {
  const ref = useRef<HTMLDivElement>(null);

  // if 0, safari might throw invalid state error
  const [{ width, min, max }, setSize] = useState({
    width: 1,
    min: 0,
    max: 0,
  });
  const scaleX = width / canvasWidth;
  const scaleY = height / canvasHeight;
  const scale = Math.min(scaleX, scaleY);

  useEffect(() => {
    function resize() {
      if (ref.current) {
        const { innerHeight: windowHeight } = window;
        const { offsetTop, offsetWidth } = ref.current;

        const top = offsetTop - before;
        const bottom = offsetTop + height + after;
        const middleWindow = windowHeight * 0.5;

        const locRatio = Math.min(bottom / windowHeight, 1);
        const triggerMin = top - middleWindow * locRatio;
        const triggerMax = bottom - middleWindow * locRatio;

        setSize({
          width: offsetWidth,
          min: Math.max(triggerMin, 0),
          max: Math.max(triggerMax, 0),
        });
      }
    }

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [ref, setSize]);

  if (before < after) {
    throw new Error("start must be smaller than end");
  }

  const { progress } = useVirtualScroll([min, max], slowMotion);

  return (
    <div ref={ref}>
      <Stage
        className={className}
        width={width}
        height={height}
        // fit the canvas
        scaleX={scale}
        scaleY={scale}
        // center the canvas
        x={-((scale - scaleX) * width) / 2}
        y={-((scale - scaleY) * height) / 2}
      >
        {scene(progress)}
      </Stage>
    </div>
  );
}
