// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import React from "react";
import { Stage } from "react-konva";
import { useEffect, useRef, useState } from "react";
import { useVirtualScroll } from "./hooks";
import { SpringValue } from "@react-spring/konva";

interface ResponsiveCanvasP {
  scene: (value: SpringValue<number>) => React.ReactNode;
  height: number;
  start?: number;
  end?: number;
  slowMotion?: number;
  hiddenMarginTop?: number;
  canvasHeight: number;
  canvasWidth: number;
  className?: string;
}

export function AnimatedCanvas({
  height,
  scene,
  start = 0,
  end = 1,
  slowMotion = 1,
  canvasHeight,
  canvasWidth,
  className,
}: ResponsiveCanvasP) {
  const ref = useRef<HTMLDivElement>(null);

  // if 0, safari might throw invalid state error
  const [{ width, offsetTop, windowHeight }, setSize] = useState({
    width: 1,
    offsetTop: 0,
    windowHeight: window.innerHeight,
  });
  const scaleX = width / canvasWidth;
  const scaleY = height / canvasHeight;
  const scale = Math.min(scaleX, scaleY);

  useEffect(() => {
    function resize() {
      if (ref.current) {
        setSize({
          width: ref.current.offsetWidth,
          offsetTop: ref.current.offsetTop,
          windowHeight: window.innerHeight,
        });
      }
    }

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [ref, setSize]);

  if (start < end) {
    throw new Error("start must be smaller than end");
  }

  const min = Math.max(offsetTop - windowHeight * start, 0);
  const max = Math.max(offsetTop - windowHeight * end, 0);
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
