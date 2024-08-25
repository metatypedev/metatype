// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { testE2eCli } from "./test.ts";
import { DenoTaskDefArgs } from "./deps.ts";

export default {
  "test-e2e": {
    inherit: "ci",
    desc: "Shorthand for `dev/test.ts`",
    fn: async ($) => {
      if (await testE2eCli($.argv) != 0) {
        throw new Error("tests failed");
      }
    },
  },
  "test-website": {
    inherit: "_ecma",
    workingDir: "./website",
    async fn($) {
      await $`pnpm lint`;
      await $`pnpm build`;
    },
  },
  "test-rust": {
    inherit: ["_rust", "_ecma", "_python"],
    async fn($) {
      await $`cargo test --locked --package meta-cli`;
      await $`cargo test --locked --workspace
                --exclude meta-cli
                --exclude typegate
                --exclude typegate_engine
                --exclude typegraph_core
                --exclude metagen_mdk_rust_static`;
      // typegraph_core tests need to be run separately
      // without --tests, the --doc is causing a link error "syntax error in VERSION script"
      await $`cargo test --locked --package typegraph_core --tests`;
    },
  },
  "test-lsp": {
    inherit: "_ecma",
    fn: ($) =>
      $`bash -sx`.stdinText("node --test --import=tsx tests/*.test.ts")
        .cwd("meta-lsp/ts-language-server"),
  },
} satisfies Record<string, DenoTaskDefArgs>;
