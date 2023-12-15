export { ghjk } from "https://raw.github.com/metatypedev/ghjk/6040bb3/mod.ts";
import { install } from "https://raw.github.com/metatypedev/ghjk/6040bb3/mod.ts";

import wasmedge from "https://raw.github.com/metatypedev/ghjk/6040bb3/ports/wasmedge.ts";
import pnpm from "https://raw.github.com/metatypedev/ghjk/6040bb3/ports/pnpm.ts";
import jco from "https://raw.github.com/metatypedev/ghjk/6040bb3/ports/jco.ts";
import mold from "https://raw.github.com/metatypedev/ghjk/6040bb3/ports/mold.ts";
import wasm_tools from "https://raw.github.com/metatypedev/ghjk/6040bb3/ports/wasm-tools.ts";
import wasm_opt from "https://raw.github.com/metatypedev/ghjk/6040bb3/ports/wasm-opt.ts";
import cargo_insta from "https://raw.github.com/metatypedev/ghjk/6040bb3/ports/cargo-insta.ts";
import asdf from "https://raw.github.com/metatypedev/ghjk/6040bb3/ports/asdf.ts";
import protoc from "https://raw.github.com/metatypedev/ghjk/6040bb3/ports/protoc.ts";
import act from "https://raw.github.com/metatypedev/ghjk/6040bb3/ports/act.ts";
import whiz from "https://raw.github.com/metatypedev/ghjk/6040bb3/ports/whiz.ts";
// import node from "https://raw.github.com/metatypedev/ghjk/6040bb3/ports/node.ts";

const PROTOC_VERSION = "v25.1";
const POETRY_VERSION = "1.7.0";
const PNPM_VERSION = "v8.8.0";
const WASM_TOOLS_VERSION = "1.0.53";
const JCO_VERSION = "0.12.1";
const WASMEDGE_VERSION = "0.13.5";
const WASM_OPT_VERSION = "0.116.0";
const MOLD_VERSION = "v2.4.0";
const CMAKE_VERSION = "3.28.0-rc6";
const CARGO_INSTA_VERSION = "1.33.0";
// const NODE_VERSION = "20.8.0";

install(
  wasmedge({ version: WASMEDGE_VERSION }),
  pnpm({ version: PNPM_VERSION }),
  wasm_tools({ version: WASM_TOOLS_VERSION }),
  wasm_opt({ version: WASM_OPT_VERSION }),
  cargo_insta({ version: CARGO_INSTA_VERSION }),
  protoc({ version: PROTOC_VERSION }),
  asdf({
    pluginRepo: "https://github.com/asdf-community/asdf-cmake",
    installType: "version",
    version: CMAKE_VERSION,
  }),
  // FIXME: jco installs node as a dep
  ...jco({ version: JCO_VERSION }),
);
if (Deno.build.os == "linux") {
  install(
    mold({
      version: MOLD_VERSION,
      replaceLd: Deno.env.has("CI"),
    }),
  );
}
// node({ version: NODE_VERSION }),
if (!Deno.env.has("NO_PYTHON")) {
  install(
    asdf({
      pluginRepo: "https://github.com/asdf-community/asdf-poetry",
      installType: "version",
      version: POETRY_VERSION,
    }),
  );
}

if (!Deno.env.has("CI")) {
  install(
    act({}),
    whiz({}),
  );
}
