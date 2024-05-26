// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../../utils/mod.ts";

Meta.test(
  {
    name: "DenoRuntime - Single Replica: support for dirs when adding deps",
  },
  async (t) => {
    await t.should(
      "work for deps specified with dir on Python SDK",
      async () => {
        const engine = await t.engine(
          "runtimes/deno/deno_dir.py",
        );

        await gql`
          query {
            test_dir(a: 4, b: 3)
          }
        `
          .expectData({
            test_dir: 7,
          })
          .on(engine);
      },
    );

    await t.should(
      "work for deps specified with dir on TypeScript SDK",
      async () => {
        const engine = await t.engine("runtimes/deno/deno_dir.ts");

        await gql`
          query {
            testDir(a: 20, b: 5)
          }
        `
          .expectData({
            testDir: 25,
          })
          .on(engine);
      },
    );
  },
);
