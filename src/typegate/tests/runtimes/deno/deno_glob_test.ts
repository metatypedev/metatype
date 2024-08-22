// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../../utils/mod.ts";

Meta.test(
  {
    name: "DenoRuntime - Single Replica: support for globs when adding deps",
  },
  async (t) => {
    await t.should(
      "work for deps specified with glob on Python SDK",
      async () => {
        const engine = await t.engine("runtimes/deno/deno_globs.py");

        await gql`
          query {
            test_glob(a: 10, b: 53)
          }
        `
          .expectData({
            test_glob: 63,
          })
          .on(engine);
      },
    );

    await t.should(
      "work for deps specified with glob on TypeScript SDK",
      async () => {
        const engine = await t.engine("runtimes/deno/deno_globs.ts");

        await gql`
          query {
            testGlob(a: 10, b: 5)
          }
        `
          .expectData({
            testGlob: 15,
          })
          .on(engine);
      },
    );
  },
);
