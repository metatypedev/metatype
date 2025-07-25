// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { DenoTaskDefArgs } from "@ghjk/ts";
import { WASMTIME_VERSION } from "../consts.ts";
import { basename } from "@std/path/posix";

export default {
  "install-sys": {
    desc: "Print a command you can use to install system items",
    fn: async ($) => {
      $.logger.warn("pipe me to a shell");
      const osRelease = await $`cat /etc/os-release`.text();
      if (/(Ubuntu|Debian|Linux pop-os)/.test(osRelease)) {
        console.log(
          `sudo apt update && ` +
            `sudo apt install -y --no-install-recommends ` +
            `gcc-multilib pkg-config libssl-dev libclang-dev perl make`,
        );
      } else if (/Fedora|Red Hat|CentOS/.test(osRelease)) {
        console.log(
          `sudo dnf install -y ` +
            `gcc gcc-c++ pkg-config openssl-devel clang-devel perl make`,
        );
      } else {
        $.logger.error("unable to determine platform");
        $.logGroup("install the following manually");
        $.log("- openssl development libs");
        $.log("- gcc");
        $.log("- clang development libs");
        $.log("- perl");
        $.log("- pkg-config");
        $.log("- make");
        $.logGroupEnd();
        throw new Error("err");
      }
    },
  },

  "install-py": {
    inherit: "_python",
    async fn($) {
      if (!(await $.workingDir.join(".venv").exists())) {
        const pyExec = $.env
          .REAL_PYTHON_EXEC_PATH!.split(":")
          .filter((str) => str.length > 0)[0];
        await $.raw`${pyExec} -m venv .venv`;
        $.logger.info("virtual env created");
      }
      await $`bash -sx`.stdinText(
        [
          `. .venv/bin/activate`,
          `poetry install --no-root`,
          `cd src/typegraph/python`,
          `poetry install --no-root`,
        ].join("\n"),
      );
    },
  },

  "install-ts": {
    inherit: "_ecma",
    fn: ($) =>
      $`pnpm install --recursive 
          --filter ./examples/typegraphs/ 
          --filter ./src/typegraph/node/
          --filter ./src/metagen/tests/*...`.stdinText(
        Array(1000)
          .map(() => "y")
          .join("\n"),
      ),
  },

  "install-website": {
    inherit: "_ecma",
    fn: ($) => $`pnpm install -C ./docs/metatype.dev/`,
  },

  // this is used somewhere in a test build.sh file
  "install-wasi-adapter": {
    fn: async ($) => {
      await $.withRetries({
        count: 10,
        delay: $.exponentialBackoff(500),
        action: async () => {
          const dir = await $.workingDir.join(".metatype").ensureDir();
          return await $.co(
            ["command", "reactor", "proxy"].map((kind) => {
              const url = `https://github.com/bytecodealliance/wasmtime` +
                `/releases/download/v${WASMTIME_VERSION}/wasi_snapshot_preview1.${kind}.wasm`;
              const token = Deno.env.get("GITHUB_TOKEN") ||
                Deno.env.get("GH_TOKEN");
              const headers = token
                ? {
                  Authorization: `Bearer ${token}`,
                }
                : {};
              return $.request(url)
                .header(headers)
                .showProgress()
                .pipeToPath(dir.join(basename(url)), {
                  create: true,
                });
            }),
          );
        },
      });
    },
  },
} satisfies Record<string, DenoTaskDefArgs>;
