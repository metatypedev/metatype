// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import React from "react";
import { WithAnimated, a } from "@react-spring/konva";

export function Animated(props: WithAnimated["Group"]["arguments"]) {
  // @ts-expect-error https://github.com/pmndrs/react-spring/issues/1784
  return <a.Group {...props} />;
}
