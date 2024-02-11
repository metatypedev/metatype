// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import React from "react";
import { useSDK } from "../../states/sdk";
import { ChoicePicker } from "../ChoicePicker";

export default function SDKTabs({ children }) {
  const [sdk, setSDK] = useSDK();
  return (
    <ChoicePicker
      choices={{
        typescript: "Typescript SDK",
        python: "Python SDK",
      }}
      choice={sdk}
      onChange={setSDK}
    >
      {children}
    </ChoicePicker>
  );
}
