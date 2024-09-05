// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

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
