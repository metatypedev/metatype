// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import React from "react";
import Tabs from "@theme/Tabs";

export default function SDKTabs({ children }) {
  return (
    <Tabs
      groupID="sdk"
      queryString="sdk"
      defaultValue="typescript"
      values={[
        { label: "Typescript SDK", value: "typescript" },
        { label: "Python SDK", value: "python" },
      ]}
    >
      {children}
    </Tabs>
  );
}
