import { file, METATYPE_VERSION, ports, stdDeps } from "./dev/deps.ts";
import installs from "./dev/installs.ts";
import tasksBuild from "./dev/tasks-build.ts";
import tasksDev from "./dev/tasks-dev.ts";
import tasksFetch from "./dev/tasks-fetch.ts";
import tasksInstall from "./dev/tasks-install.ts";
import tasksLint from "./dev/tasks-lint.ts";
import tasksTest from "./dev/tasks-test.ts";
import { grepLock } from "./dev/lock.ts";

const ghjk = file({
  defaultEnv: "dev",
  tasks: {
    ...tasksBuild,
    ...tasksDev,
    ...tasksFetch,
    ...tasksInstall,
    ...tasksLint,
    ...tasksTest,
  },
});
export const sophon = ghjk.sophon;
const { env, task } = ghjk;

env("main")
  .install(installs.deno)
  .vars({
    RUST_LOG:
      "typegate=info,typegate_engine=info,mt_deno=info,swc_ecma_codegen=off,tracing::span=off",
    WASMTIME_BACKTRACE_DETAILS: "1",
    TYPEGRAPH_VERSION: "0.0.3",
    CLICOLOR_FORCE: "1",
  })
  .allowedBuildDeps(
    installs.python_latest,
    installs.node,
    ...stdDeps(),
  );

env("_rust")
  .install(
    // use rustup for the actual toolchain
    ports.protoc({ version: "v24.1" }),
    ports.pipi({ packageName: "cmake" })[0],
  );

if (Deno.build.os == "linux" && !Deno.env.has("NO_MOLD")) {
  env("_rust")
    .install(
      ports.mold({
        version: "v2.4.0",
        replaceLd: Deno.env.has("CI") || Deno.env.has("OCI"),
      }),
    );
}

env("_ecma")
  .install(
    installs.node,
    ports.pnpm({ version: "v9.0.5" }),
    ports.npmi({ packageName: "node-gyp", version: "10.0.1" })[0],
  );

env("_python")
  .install(
    installs.python,
    ports.pipi({
      packageName: "ruff",
      version: "0.4.7",
    })[0],
    ports.pipi({
      packageName: "poetry",
      version: "1.7.0",
    })[0],
  );

env("_wasm")
  .install(
    ports.cargobi({
      crateName: "wasm-opt",
      version: "0.116.1",
      locked: true,
    }),
    ports.cargobi({
      crateName: "wasm-tools",
      version: "1.208.1",
      locked: true,
    }),
    ports.pipi({ packageName: "componentize-py", version: "0.13.4" })[0],
    // FIXME: jco installs node as a dep
    ports.npmi({
      packageName: "@bytecodealliance/jco",
      version: "1.2.4",
    })[0],
  );

env("oci")
  .inherit(["_rust", "_wasm"])

env("ci")
  .inherit(["_rust", "_python", "_ecma", "_wasm"])
  .install(
    ports.pipi({ packageName: "pre-commit", version: "3.7.1" })[0],
    ports.temporal_cli({ version: "v0.10.7" }),
    ports.cargobi({
      crateName: "cargo-insta",
      version: "1.33.0",
      locked: true,
    }),
    ports.cargobi({
      crateName: "cross",
      version: "0.2.5",
      locked: true,
    }),
  );

env("dev")
  .inherit("ci")
  .install(
    ports.act(),
    ports.cargobi({ crateName: "whiz", locked: true }),
    ports.cargobi({ crateName: "wit-deps-cli", locked: true }),
  );

task("clean-deno-lock", {
  installs: ports.jq_ghrel(),
  async fn($) {
    const jqOp1 =
      `del(.packages.specifiers["npm:@typegraph/sdk@${METATYPE_VERSION}"])`;
    const jqOp2 = `del(.packages.npm["@typegraph/sdk@${METATYPE_VERSION}"])`;
    const jqOp = `${jqOp1} | ${jqOp2}`;
    $.path(
      "typegate/deno.lock",
    ).writeText(
      await $`jq ${jqOp} typegate/deno.lock`.text(),
    );
  },
});

task(
  "lock-grep",
  () => grepLock(),
  { desc: "Update versions according to dev/lock.yml" },
);

task(
  "print-version",
  () => console.log(METATYPE_VERSION),
  { desc: "Print $METATYPE_VERSION" },
);
