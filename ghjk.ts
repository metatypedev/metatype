export { ghjk } from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/mod.ts";

import wasmedge from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/wasmedge.ts";
import pnpm from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/pnpm.ts";
import jco from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/jco.ts";
import mold from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/mold.ts";
import wasm_tools from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/wasm-tools.ts";
import wasm_opt from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/wasm-opt.ts";
import cargo_insta from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/cargo-insta.ts";
import asdf from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/asdf.ts";
import protoc from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/protoc.ts";
import act from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/act.ts";
import earthly from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/earthly.ts";
import whiz from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/whiz.ts";
// import node from "https://raw.github.com/metatypedev/ghjk/v0.1.0-alpha/ports/node.ts";

const PROTOC_VERSION = "v24.x";
const POETRY_VERSION = "1.7.0";
const PNPM_VERSION = "8.8.0";
const WASM_TOOLS_VERSION = "1.0.53";
const JCO_VERSION = "0.12.1";
const WASMEDGE_VERSION = "0.12.1";
const WASM_OPT_VERSION = "0.116.0";
const MOLD_VERSION = "undefined";
const CMAKE_VERSION = "undefined";
const CARGO_INSTA_VERSION = "1.33.0";
// const NODE_VERSION = "20.8.0";

wasmedge({ version: WASMEDGE_VERSION });
pnpm({ version: PNPM_VERSION });
wasm_tools({ version: WASM_TOOLS_VERSION });
wasm_opt({ version: WASM_OPT_VERSION });
cargo_insta({ version: CARGO_INSTA_VERSION });
// FIXME: jco installs node as a dep
jco({ version: JCO_VERSION });
protoc({ version: PROTOC_VERSION });
asdf({
  pluginRepo: "https://github.com/asdf-community/asdf-cmake",
  installType: "version",
  version: CMAKE_VERSION,
});
asdf({
  pluginRepo: "https://github.com/asdf-community/asdf-poetry",
  installType: "version",
  version: POETRY_VERSION,
});
mold({ version: MOLD_VERSION });
// node({ version: NODE_VERSION });

if (Deno.env.get("GHJK_DEV")) {
  act({});
  earthly({});
  whiz({});
}

if (Deno.env.get("GHJK_CI")) {
}
