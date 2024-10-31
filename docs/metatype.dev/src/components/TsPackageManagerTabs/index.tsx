// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import React, { PropsWithChildren } from "react";
import { useTsPackageManager } from "../../states/package_manager";
import { ChoicePicker } from "../ChoicePicker";

export default function NakedTsPmPicker({
  children,
}: PropsWithChildren<Record<string, never>>) {
  const [pm, setPm] = useTsPackageManager();
  return (
    <ChoicePicker
      choices={{
        pnpm: "pnpm",
        npm: "npm",
        jsr: "jsr",
        deno: "deno",
        yarn: "yarn",
        bun: "bun",
      }}
      choice={pm}
      onChange={setPm}
    >
      {children}
    </ChoicePicker>
  );
}
