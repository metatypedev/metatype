// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import React, { useEffect } from "react";
import Gleap from "gleap";

export default function Root({ children }) {
  useEffect(() => {
    Gleap.initialize("dyWs3yourDQZkNztYzV7yZgcyMcWGpaF");
  }, []);

  return <>{children}</>;
}
