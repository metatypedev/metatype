// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import React, { PropsWithChildren } from "react";
import { SDK, useSDK } from "../../states/sdk";
import { Choice, ChoicePicker, NakedPicker } from "../ChoicePicker";

export default function SDKTabs({
  children,
}: PropsWithChildren<Record<string, never>>) {
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

export function NakedSdkPicker({
  children,
}: PropsWithChildren<Record<string, never>>) {
  const [sdk] = useSDK();
  return (
    <NakedPicker
      choices={{
        typescript: "Typescript SDK",
        python: "Python SDK",
      }}
      choice={sdk}
    >
      {children}
    </NakedPicker>
  );
}

export function SdkChoice(props: PropsWithChildren<{ value: SDK }>) {
  return <Choice {...props} />;
}
