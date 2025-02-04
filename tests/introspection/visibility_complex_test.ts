// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Meta } from "test-utils/mod.ts";
import { enumerateTypes, fullIntrospection } from "./common.ts";

const context = {
  control_basic: "PASS",
  control_union: "PASS",
  control_rec_other: "PASS",
  control_inner_variant: "PASS",
};

Meta.test({
  name: "Visibility check upon introspection on complex typegraph",
  introspection: true,
}, async (t) => {
  const e = await t.engine("introspection/visibility_complex.py");
  await t.should(
    "enumerate types without context on complex typegraph",
    async () => {
      await enumerateTypes()
        .matchOkSnapshot(t)
        .on(e);
    },
  );

  await t.should(
    "enumerate types after context defined on complex typegraph",
    async () => {
      await enumerateTypes()
        .withContext(context)
        .matchOkSnapshot(t)
        .on(e);
    },
  );
});

Meta.test({
  name: "Full introspection without context provided on complex typegraph",
  introspection: true,
}, async (t) => {
  const e = await t.engine("introspection/visibility_complex.py");
  await t.should(
    "have a few fields inivible without proper access",
    async () => {
      await fullIntrospection()
        .matchOkSnapshot(t)
        .on(e);
    },
  );
});
