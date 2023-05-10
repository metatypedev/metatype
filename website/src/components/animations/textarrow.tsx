// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import Konva from "konva";
import React, { useEffect, useRef, useState } from "react";
import { Group, Arrow, Text } from "react-konva";
import useFontFaceObserver from "use-font-face-observer";

interface TextArrowP {
  p: [number, number];
  size: number;
  text: string;
  arrow?: [number, number];
  fontFamily?: string;
}

export function blockHeight(size: number, height: number) {
  return size * height * 0.6;
}

export function TextArrow({
  p: [x, y],
  size,
  text,
  arrow,
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

  if (!arrow) {
    return t;
  }

  const [px, py] = arrow;

  const vertical = px - mx < py - my;
  const sx =
    px < x
      ? mx - width / 2 - (vertical ? 10 : 0)
      : mx + width / 2 + (!vertical ? width / 2 + 10 : 0);
  const sy =
    py < y
      ? my - height / 2 - (vertical ? 10 : 0)
      : my + height / 2 + (vertical ? height / 2 + 10 : 0);

  return (
    <Group>
      {t}
      <Arrow
        points={[sx, sy, px, py]}
        fill="black"
        stroke="black"
        strokeWidth={1}
      />
    </Group>
  );
}
