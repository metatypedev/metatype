// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { DenoTaskDefArgs } from "@ghjk/ts";
import * as ports from "@ghjk/ports_wip";

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
      ports.cargobi({ crateName: "protobuf-codegen", version: "3.7.1" }),
    ],
    fn: ($) => {
      // https://github.com/protocolbuffers/protobuf/issues/13346
      const protoFiles = [
        "protocol/events.proto",
        "protocol/metadata.proto",
      ];

      return $`protoc --proto_path=. ${protoFiles} --rs_out=src/protocol`;
    },
  },
} satisfies Record<string, DenoTaskDefArgs>;
