// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { assert } from "std/assert/mod.ts";
import type { ShellOutput } from "test-utils/shell.ts";

Meta.test("DENO_V8_FLAGS env var", async (t) => {
  let timeout: number | undefined = undefined;
  const res = await Promise.race([
    new Promise<ShellOutput>((_res, rej) =>
      timeout = setTimeout(
        () => rej(new Error("timeout building typegate")),
        10 * 60 * 1000,
      )
    ),
    t.shell(
      `cargo run -p meta-cli -F typegate -- typegate`.split(" "),
      {
        env: {
          DENO_V8_FLAGS: "--help",
        },
      },
    ),
  ]);
  if (timeout) {
    clearTimeout(timeout);
  }
  // the following string is expected in the help output
  assert(/The following syntax for options is accepted/.test(res.stdout));
});
