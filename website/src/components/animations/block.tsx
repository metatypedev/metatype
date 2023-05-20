// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import Konva from "konva";
import { RectConfig } from "konva/lib/shapes/Rect";
import React from "react";
import { Group, Rect } from "react-konva";

const colors: Record<string, string> = {
  blue: "rgb(160, 195, 242)",
  gray: "rgb(239, 239, 239)",
  orange: "rgb(252, 201, 159)",
  pink: "rgb(201, 158, 181)",
  red: "rgb(221, 147, 143)",
  green: "rgb(157, 187, 193)",
  yellow: "rgb(250, 226, 144)",
  turquoise: "rgb(156, 208, 228)",
  purple: "rgb(170, 158, 208)",
};

interface BlockP {
  p: [number, number];
  size: number;
  width: number;
  height: number;
  color: string;
  connectors?: boolean;
}

export function blockHeight(size: number, height: number) {
  return size * height * 0.6;
}

function CacheRect(props: RectConfig) {
  const ref = React.useRef<Konva.Rect>(null);
  React.useEffect(() => {
    ref.current?.cache();
  });
  return <Rect ref={ref} {...props} />;
}

export function Block({
  p: [x, y],
  size,
  width,
  height,
  color,
  connectors = true,
}: BlockP) {
  const mx = x - (width * size) / 2;
  const my = y - blockHeight(size, height) / 2;

  const b = (
    <Rect
      x={mx}
      y={my}
      width={size * width}
      height={blockHeight(size, height)}
      fill={colors[color] ?? color}
      stroke="black"
      strokeWidth={3}
      lineJoin="round"
    />
  );

  if (!connectors) {
    return b;
  }

  const deltas = Array.from({ length: width }, (_, i) => i * size + size * 0.2);
  return (
    <Group>
      {b}
      {deltas.map((dx) => (
        <CacheRect
          key={dx}
          x={mx + dx}
          y={my - size * 0.25}
          width={size * 0.6}
          height={size * 0.25}
          fill={colors[color] ?? color}
          filters={[Konva.Filters.Brighten]}
          brightness={0.075}
          stroke="black"
          strokeWidth={3}
          lineJoin="round"
        />
      ))}
    </Group>
  );
}
