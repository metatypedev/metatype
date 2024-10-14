// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type { DenoTaskDefArgs } from "../deps.ts";
import { ports } from "../deps.ts";

export default {
  "gen-pyrt-bind": {
    inherit: "_wasm",
    async fn($) {
      await $.removeIfExists("./src/pyrt_wit_wire/wit_wire");
      await $`componentize-py -d ../wit/wit-wire.wit bindings .`.cwd(
        "./src/pyrt_wit_wire",
      );
    },
  },
  "gen-subs-protoc": {
    desc: "Regenerate substantial types",
    workingDir: "src/substantial",
    inherit: "_rust",
    installs: [
      ports.cargobi({ crateName: "protobuf-codegen", version: "3.5.1" }),
    ],
    fn: ($) => {
      // https://github.com/protocolbuffers/protobuf/issues/13346
      const protoFiles = [
        "protocol/events.proto",
        "protocol/metadata.proto",
      ];
      return $`protoc --proto_path=. ${protoFiles} --rust_out=src/protocol --rust_opt=experimental-codegen=enabled,kernel=cpp`;
    },
  },
} satisfies Record<string, DenoTaskDefArgs>;
