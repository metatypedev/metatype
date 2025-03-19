// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Meta } from "test-utils/mod.ts";
import { enumerateTypesAndInspectFields } from "./common.ts";

Meta.test({
  name: "Policy rule logic upon introspection on nested struct",
  introspection: true,
}, async (t) => {
  const e = await t.engine("introspection/visibility_simple.py");
  await t.should(
    "enumerate only authorized types",
    async () => {
      await enumerateTypesAndInspectFields() // pass_through at root
        .matchOkSnapshot(t)
        .on(e);
    },
  );

  await t.should(
    "enumerate nothing except a dummy empty type Query placeholder",
    async () => {
      await enumerateTypesAndInspectFields()
        .withContext({
          root_policy: "DENY",
        })
        .matchOkSnapshot(t)
        .on(e);
    },
  );

  await t.should(
    "enumerate ALL types",
    async () => {
      await enumerateTypesAndInspectFields()
        .withContext({
          root_policy: "ALLOW",
        })
        .matchOkSnapshot(t)
        .on(e);
    },
  );
});
