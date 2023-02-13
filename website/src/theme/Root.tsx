// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import React, { useEffect } from "react";
import Gleap from "gleap";

export default function Root({ children }) {
  useEffect(() => {
    Gleap.initialize("dyWs3yourDQZkNztYzV7yZgcyMcWGpaF");
  }, []);

  return <>{children}</>;
}
