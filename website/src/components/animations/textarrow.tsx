// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import Konva from "konva";
import React, { useEffect, useRef, useState } from "react";
import { Group, Arrow, Text } from "react-konva";
import useFontFaceObserver from "use-font-face-observer";

interface TextArrowP {
  p: [number, number];
  size: number;
  text: string;
  arrows?: [number, number][];
  fontFamily?: string;
}

export function blockHeight(size: number, height: number) {
  return size * height * 0.6;
}

export function TextArrow({
  p: [x, y],
  size,
  text,
  arrows = [],
  fontFamily = "Lexend",
}: TextArrowP) {
  const isFontListLoaded = useFontFaceObserver([{ family: fontFamily }]);
  const [[width, height], setSize] = useState<[number, number]>([0, 0]);
  const ref = useRef<Konva.Text>(null);

  useEffect(() => {
    if (ref.current) {
      const { width, height } = ref.current.measureSize(text);
      setSize([width, height]);
    }
  }, [ref, setSize, isFontListLoaded]);

  const mx = x - width / 2;
  const my = y - height / 2;

  const t = (
    <Text
      ref={ref}
      x={mx}
      y={my}
      text={text}
      fontFamily={fontFamily}
      fontSize={size}
    />
  );

  if (arrows.length === 0) {
    return t;
  }

  return (
    <Group>
      {t}
      {arrows.map(([px, py]) => {
        const vertical = px - x < py - my;
        const sx =
          px < x
            ? x - (vertical ? 0 : width / 2 + 10)
            : x + (vertical ? 0 : width / 2 + 10);
        const sy =
          py < y
            ? y - (!vertical ? 0 : height / 2 + 10)
            : y + (!vertical ? 0 : height / 2 + 10);

        return (
          <Arrow
            key={`${px}-${py}`}
            points={[sx, sy, px, py]}
            fill="black"
            stroke="black"
            strokeWidth={1}
          />
        );
      })}
    </Group>
  );
}
