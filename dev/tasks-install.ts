// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { DenoTaskDefArgs, std_url } from "./deps.ts";
import { WASMTIME_VERSION } from "./consts.ts";

const tasks: Record<string, DenoTaskDefArgs> = {
  "install-sys": {
    desc: "Print a command you can use to install system items",
    fn: async ($) => {
      $.logger.info("pipe me to a shell");
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
      console.log($.env);
      await $`bash -sx`.stdinText(
        [
          `. .venv/bin/activate`,
          `poetry install --no-root`,
          `cd typegraph/python`,
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
          --filter ./typegraph/node/
          --filter ./libs/metagen/tests/*...`.stdinText(
        Array(1000)
          .map(() => "y")
          .join("\n"),
      ),
  },

  "install-website": {
    inherit: "_ecma",
    fn: ($) => $`pnpm install -C ./website/`,
  },

  "install-lsp": {
    inherit: "_ecma",
    fn: ($) => $`pnpm install -C ./meta-lsp/ --frozen-lockfile --recursive`,
  },

  // this is used somewhere in a test build.sh file
  "install-wasi-adapter": {
    fn: async ($) => {
      await $.withRetries({
        count: 10,
        delay: $.exponentialBackoff(500),
        action: async () =>
          await $.co(
            ["command", "reactor", "proxy"].map((kind) => {
              const url = `https://github.com/bytecodealliance/wasmtime` +
                `/releases/download/v${WASMTIME_VERSION}/wasi_snapshot_preview1.${kind}.wasm`;
              return $.request(url)
                .showProgress()
                .pipeToPath(
                  $.workingDir.join("tmp").join(std_url.basename(url)),
                  {
                    create: true,
                  },
                );
            }),
          ),
      });
    },
  },
};
export default tasks;
