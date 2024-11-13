// @ts-nocheck: Deno file

import { METATYPE_VERSION, PUBLISHED_VERSION } from "./tools/consts.ts";
import { file, ports, sedLock, semver, stdDeps } from "./tools/deps.ts";
import installs from "./tools/installs.ts";
import tasks from "./tools/tasks/mod.ts";

const ghjk = file({
  defaultEnv: Deno.env.get("CI") ? "ci" : Deno.env.get("OCI") ? "oci" : "dev",
  tasks,
});
export const sophon = ghjk.sophon;
const { env, task } = ghjk;

env("main")
  .install(installs.deno)
  .vars({
    RUST_LOG:
      "info,typegate=debug,deno=warn,swc_ecma_codegen=off,tracing::span=off,quaint=off",
    TYPEGRAPH_VERSION: "0.0.3",
    CLICOLOR_FORCE: "1",
    CROSS_CONFIG: "tools/Cross.toml",
    GIT_CLIFF_CONFIG: "tools/cliff.toml",
  })
  .allowedBuildDeps(
    ...stdDeps(),
    installs.python_latest,
    installs.node,
    installs.rust_stable,
  );

env("_rust").install(
  // use rustup for the actual toolchain
  ports.protoc({ version: "v28.2" }),
  ports.cmake()[0],
);

if (Deno.build.os == "linux" && !Deno.env.has("NO_MOLD")) {
  const mold = ports.mold({
    version: "v2.4.0",
    replaceLd: true,
  });
  env("dev").install(mold);
  env("oci").install(mold);
  env("ci").install(mold);
}

env("_ecma").install(
  installs.node,
  ports.pnpm({ version: "v9.4.0" }),
  ports.npmi({ packageName: "node-gyp", version: "10.0.1" })[0],
);

env("_python").install(
  installs.python,
  ports.pipi({
    packageName: "ruff",
    version: "0.4.7",
  })[0],
  ports.pipi({
    packageName: "poetry",
    version: "1.8.3",
  })[0],
);

env("_wasm").install(
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
    version: "1.3.0",
  })[0],
);

env("oci").inherit(["_rust", "_wasm"]);

env("ci")
  .inherit(["_rust", "_python", "_ecma", "_wasm"])
  .install(
    ports.pipi({ packageName: "pre-commit", version: "3.7.1" })[0],
    ports.temporal_cli({ version: "v0.13.1" }),
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
  // debug v8 to fix MET-633: segementation fault bug with custom deno rt
  // doesn't appear in CI so only dev envs get it
  .var("V8_FORCE_DEBUG", "true")
  .install(
    ports.act(),
    ports.cargobi({ crateName: "whiz", locked: true }),
    ports.cargobi({ crateName: "wit-deps-cli", locked: true }),
    ports.cargobi({ crateName: "git-cliff", locked: true }),
  );

task("version-print", () => console.log(METATYPE_VERSION), {
  desc: "Print $METATYPE_VERSION",
});

task("version-bump", async ($) => {
  const bumps = [
    "major",
    "premajor",
    "minor",
    "preminor",
    "patch",
    "prepatch",
    "prerelease",
  ];
  const bump = $.argv[0];

  if (!bumps.includes(bump)) {
    throw new Error(
      `invalid argument "${bump}", valid are: ${bumps.join(", ")}`,
    );
  }

  const newVersion = semver.format(
    semver.increment(
      semver.parse(METATYPE_VERSION),
      bump as semver.ReleaseType,
      {
        prerelease: "rc",
      },
    ),
  );

  $.logStep(`Bumping ${METATYPE_VERSION} → ${newVersion}`);
  const lines = [[/^(export const METATYPE_VERSION = ").*(";)$/, newVersion]];
  if (bump === "prerelease") {
    $.logStep(
      `Bumping published version ${PUBLISHED_VERSION} → ${METATYPE_VERSION}`,
    );
    lines.push([
      /^(export const PUBLISHED_VERSION = ").*(";)$/,
      METATYPE_VERSION,
    ]);
  }

  await sedLock($.workingDir, {
    lines: {
      "./tools/consts.ts": lines,
    },
  });
  await $`ghjk x lock-sed`;
});

task(
  "clean-rust",
  ($) =>
    $.co([
      $`cargo clean`,
      $`cargo clean`.cwd("tests/runtimes/wasm_reflected/rust"),
      $`cargo clean`.cwd("tests/runtimes/wasm_wire/rust"),
      $`cargo clean`.cwd("tests/metagen/typegraphs/sample/rs"),
      $`cargo clean`.cwd("tests/metagen/typegraphs/identities/rs"),
      $`cargo clean`.cwd("./examples/typegraphs/metagen/"),
    ]),
  { inherit: "_rust", desc: "Clean cache of all cargo workspaces in repo." },
);

task(
  "clean-node",
  ($) =>
    $.co([
      $.path("./docs/metatype.dev/node_modules"),
      $.path("./docs/metatype.dev/build"),
      $.path("./tests/e2e/nextjs/apollo/node_modules"),
      $.path("./tests/runtimes/temporal/worker/node_modules"),
    ].map(async (path) => {
      if (await path.exists()) {
        await path.remove({ recursive: true });
      }
    })),
  {
    inherit: "_ecma",
    desc: "Remove all node_modules directories in tree and other js artifacts.",
  },
);
