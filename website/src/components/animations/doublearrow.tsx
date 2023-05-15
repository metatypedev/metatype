// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { ArrowConfig } from "konva/lib/shapes/Arrow";
import React from "react";
import { Arrow } from "react-konva";

export function DoubleArrow(props: ArrowConfig) {
  return (
    <>
      <Arrow {...props} fill="white" stroke="white" strokeWidth={3} />
      <Arrow {...props} fill="black" stroke="black" strokeWidth={1} />
    </>
  );
}
