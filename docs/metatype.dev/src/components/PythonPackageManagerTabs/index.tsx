// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import React, { PropsWithChildren } from "react";
import { usePythonPackageManager } from "../../states/package_manager";
import { ChoicePicker } from "../ChoicePicker";

export default function NakedPythonPmPicker({
  children,
}: PropsWithChildren<Record<string, never>>) {
  const [pm, setPm] = usePythonPackageManager();
  return (
    <ChoicePicker
      choices={{
        poetry: "poetry",
        pip: "pip",
      }}
      choice={pm}
      onChange={setPm}
    >
      {children}
    </ChoicePicker>
  );
}
