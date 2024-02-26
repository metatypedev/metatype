// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { t, typegraph } from "@typegraph/sdk/index.js";

typegraph("type infer", (g: any) => {
  const test_scheme = t.struct();
  g.expose({
    test: test_scheme,
  });
});
