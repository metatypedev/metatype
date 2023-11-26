export { ghjk } from "https://raw.github.com/metatypedev/ghjk/feat/mvp/mod.ts";

import wasmedge from "https://raw.github.com/metatypedev/ghjk/feat/mvp/plugs/wasmedge.ts";
import pnpm from "https://raw.github.com/metatypedev/ghjk/feat/mvp/plugs/pnpm.ts";
import jco from "https://raw.github.com/metatypedev/ghjk/feat/mvp/plugs/jco.ts";
// import mold from "https://raw.github.com/metatypedev/ghjk/feat/mvp/plugs/mold.ts";
import wasm_tools from "https://raw.github.com/metatypedev/ghjk/feat/mvp/plugs/wasm-tools.ts";
import wasm_opt from "https://raw.github.com/metatypedev/ghjk/feat/mvp/plugs/wasm-opt.ts";
import cargo_insta from "https://raw.github.com/metatypedev/ghjk/feat/mvp/plugs/cargo-insta.ts";
import asdf from "https://raw.github.com/metatypedev/ghjk/feat/mvp/plugs/asdf.ts";
import protoc from "https://raw.github.com/metatypedev/ghjk/feat/mvp/plugs/protoc.ts";
import act from "https://raw.github.com/metatypedev/ghjk/feat/mvp/plugs/act.ts";

const PROTOC_VERSION = "v25.1";
const POETRY_VERSION = "1.7.0";
const PNPM_VERSION = "8.8.0";
const WASM_TOOLS_VERSION = "1.0.53";
const JCO_VERSION = "0.12.1";
const WASMEDGE_VERSION = "0.12.1";
const WASM_OPT_VERSION = "0.116.0";
const CARGO_INSTA_VERSION = "1.33.0";

wasmedge({ version: WASMEDGE_VERSION });
pnpm({ version: PNPM_VERSION });
wasm_tools({ version: WASM_TOOLS_VERSION });
wasm_opt({ version: WASM_OPT_VERSION });
cargo_insta({ version: CARGO_INSTA_VERSION });
jco({ version: JCO_VERSION });
protoc({ version: PROTOC_VERSION });
asdf({
  plugRepo: "https://github.com/asdf-community/asdf-poetry",
  installType: "version",
  version: POETRY_VERSION,
});

if (Deno.env.get("GHJK_DEV")) {
  act({});
}

if (Deno.env.get("GHJK_CI")) {
}
