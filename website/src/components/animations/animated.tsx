// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import React from "react";
import { WithAnimated, a } from "@react-spring/konva";

export function Animated(props: WithAnimated["Group"]["arguments"]) {
  // @ts-expect-error https://github.com/pmndrs/react-spring/issues/1784
  return <a.Group {...props} />;
}
