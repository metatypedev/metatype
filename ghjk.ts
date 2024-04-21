export { ghjk } from "https://raw.github.com/metatypedev/ghjk/423d38e/mod.ts";
import * as ghjk from "https://raw.github.com/metatypedev/ghjk/423d38e/mod.ts";
import { thinInstallConfig } from "https://raw.github.com/metatypedev/ghjk/423d38e/utils/mod.ts";
import * as ports from "https://raw.github.com/metatypedev/ghjk/423d38e/ports/mod.ts";

const PROTOC_VERSION = "v24.1";
const POETRY_VERSION = "1.7.0";
const PYTHON_VERSION = "3.8.18";
const PNPM_VERSION = "v9.0.5";
const WASM_TOOLS_VERSION = "1.0.53";
const JCO_VERSION = "1.0.0";
const WASMEDGE_VERSION = "0.13.5";
const WASM_OPT_VERSION = "0.116.0";
const MOLD_VERSION = "v2.4.0";
const CMAKE_VERSION = "3.28.0-rc6";
const CARGO_INSTA_VERSION = "1.33.0";
const NODE_VERSION = "20.8.0";
const TEMPORAL_VERSION = "0.10.7";
const METATYPE_VERSION = "0.3.7-0";

const installs = {
  python: ports.cpy_bs({ version: PYTHON_VERSION, releaseTag: "20240224" }),
  python_latest: ports.cpy_bs({ releaseTag: "20240224" }),
  node: ports.node({ version: NODE_VERSION }),
  comp_py: ports.pipi({ packageName: "componentize-py" }),
  wasm_opt: ports.cargobi({
    crateName: "wasm-opt",
    version: WASM_OPT_VERSION,
    locked: true,
  }),
};

const allowedPortDeps = [
  ...ghjk.stdDeps(),
  ...[installs.python_latest, installs.node].map((fat) => ({
    manifest: fat.port,
    defaultInst: thinInstallConfig(fat),
  })),
];
export const secureConfig = ghjk.secureConfig({ allowedPortDeps });

const inCi = () => !!Deno.env.get("CI");
const inOci = () => !!Deno.env.get("OCI");
const inDev = () => !inCi() && !inOci();

ghjk.install(
  ports.wasmedge({ version: WASMEDGE_VERSION }),
  ports.protoc({ version: PROTOC_VERSION }),
  ports.asdf({
    pluginRepo: "https://github.com/asdf-community/asdf-cmake",
    installType: "version",
    version: CMAKE_VERSION,
  }),
  ports.cargo_binstall(),
  ports.temporal_cli({ version: TEMPORAL_VERSION }),
);

if (!inOci()) {
  ghjk.install(
    // FIXME: use cargobi when avail
    installs.wasm_opt,
    ports.cargobi({
      crateName: "wasm-tools",
      version: WASM_TOOLS_VERSION,
      locked: true,
    }),
    // these aren't required by the typegate build process
    ports.cargobi({
      crateName: "cargo-insta",
      version: CARGO_INSTA_VERSION,
      locked: true,
    }),
    installs.node,
    ports.pnpm({ version: PNPM_VERSION }),
    // FIXME: jco installs node as a dep
    ports.npmi({
      packageName: "@bytecodealliance/jco",
      version: JCO_VERSION,
    })[0],
    ports.npmi({ packageName: "node-gyp", version: "10.0.1" })[0],
  );
}

if (Deno.build.os == "linux" && !Deno.env.has("NO_MOLD")) {
  ghjk.install(
    ports.mold({
      version: MOLD_VERSION,
      replaceLd: Deno.env.has("CI") || Deno.env.has("OCI"),
    }),
  );
}

if (!Deno.env.has("NO_PYTHON")) {
  ghjk.install(
    installs.python,
    ports.pipi({
      packageName: "poetry",
      version: POETRY_VERSION,
    })[0],
  );
  if (inDev()) {
    ghjk.install(
      ports.pipi({ packageName: "pre-commit" })[0],
    );
  }
}

if (inDev()) {
  ghjk.install(
    ports.act({}),
    ports.cargobi({ crateName: "whiz", locked: true }),
    ports.cargobi({ crateName: "wasmtime-cli", locked: true }),
    installs.comp_py[0],
  );
}

ghjk.task("clean-deno-lock", {
  installs: [
    // jq
  ],
  async fn({ $ }) {
    const jqOp1 =
      `del(.packages.specifiers["npm:@typegraph/sdk@${METATYPE_VERSION}"])`;
    const jqOp2 = `del(.packages.npm["@typegraph/sdk@${METATYPE_VERSION}"])`;
    const jqOp = `${jqOp1} | ${jqOp2}`;
    await Deno.writeTextFile(
      "typegate/deno.lock",
      await $`jq ${jqOp} typegate/deno.lock`.text(),
    );
  },
});

ghjk.task("gen-pyrt-bind", {
  installs: installs.comp_py,
  allowedPortDeps,
  async fn({ $ }) {
    await $.removeIfExists("./libs/pyrt_component/pyrt");
    await $`componentize-py -d wit/ bindings .`.cwd("./libs/pyrt_component");
  },
});

ghjk.task("build-pyrt", {
  installs: [...installs.comp_py, installs.wasm_opt],
  allowedPortDeps,
  async fn({ $ }) {
    await $`componentize-py -d wit/ componentize -o ../../target/pyrt.wasm main`
      .cwd("./libs/pyrt_component");
    // TODO: explicitly install wasmtime
    await $`wasmtime compile -W component-model  ./target/pyrt.wasm -o ./target/pyrt.cwasm`;
    // await $`wasm-opt -Oz ./target/pyrt.wasm -o ./target/pyrt.wasm2`;
  },
});
