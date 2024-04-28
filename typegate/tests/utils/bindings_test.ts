// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  get_version,
  typegraph_validate,
  typescript_format_code,
  validate_prisma_runtime_data,
  wasmtime_wit,
} from "native";
import type { WasmInput } from "../../engine/runtime.js";

function assert<T>(val: T) {
  if (!val) throw Error("assertion failed");
}
// deno-lint-ignore no-unused-vars
function dbg<T>(val: T) {
  console.log("DBG: ", val);
  return val;
}

Deno.test("version", () => {
  assert(
    typeof Meta.version() === "string",
  );

  assert(
    typeof get_version() === "string",
  );
});

Deno.test("typescriptFormatCode", () => {
  const source = "console.log( {hello: 'world'})";

  assert(
    Meta.typescriptFormatCode(source) ===
      `console.log({ hello: "world" });\n`,
  );

  const out = typescript_format_code({ source });
  assert(out!.Ok!.formatted_code === `console.log({ hello: "world" });\n`);
});

Deno.test("validatePrismaRuntimeData", () => {
  const json = {
    name: "my_prisma",
    connection_string_secret: "secret",
    models: [],
    relationships: [],
  };
  Meta.validatePrismaRuntimeData(json);

  const out = validate_prisma_runtime_data({ obj: json });
  assert(!out.error);
});

Deno.test("typegraphValidate", () => {
  const json = {
    "$id": "https://metatype.dev/specs/0.0.3.json",
    "types": [
      {
        "type": "object",
        "title": "introspection",
        "runtime": 0,
        "policies": [],
        "config": {},
        "as_id": false,
        "properties": {
          "__type": 1,
          "__schema": 64,
        },
        "required": [
          "__type",
          "__schema",
        ],
      },
      {
        "type": "function",
        "title": "func_79",
        "runtime": 1,
        "policies": [
          0,
        ],
        "config": {},
        "as_id": false,
        "input": 2,
        "output": 4,
        "materializer": 0,
        "rate_weight": null,
        "rate_calls": false,
      },
    ],
    "materializers": [
      {
        "name": "getType",
        "runtime": 1,
        "effect": {
          "effect": "read",
          "idempotent": true,
        },
        "data": {},
      },
    ],
    "runtimes": [
      {
        "name": "deno",
        "data": {
          "worker": "default",
          "permissions": {},
        },
      },
      {
        "name": "typegraph",
        "data": {},
      },
    ],
    "policies": [
      {
        "name": "__public",
        "materializer": 2,
      },
    ],
    "meta": {
      "prefix": null,
      "secrets": [],
      "queries": {
        "dynamic": true,
        "endpoints": [],
      },
      "cors": {
        "allow_origin": [],
        "allow_headers": [],
        "expose_headers": [],
        "allow_methods": [],
        "allow_credentials": true,
        "max_age_sec": null,
      },
      "auths": [],
      "rate": null,
      "version": "0.0.3",
      "randomSeed": null,
      "artifacts": {},
    },
  };
  const str = JSON.stringify(json);
  assert(JSON.stringify(JSON.parse(Meta.typegraphValidate(str))) == str);

  const out = typegraph_validate({ json: str });
  assert("Valid" in out && JSON.stringify(JSON.parse(out.Valid.json)) == str);
});

Deno.test("Wasm Wit", async () => {
  const input: WasmInput = {
    wasm: "typegate/tests/runtimes/wasm_reflected/rust.wasm",
    func: "add",
    args: [JSON.stringify(1), JSON.stringify(2)],
  };
  assert(Meta.wasmtimeWit(input) == "3.0");

  const out = await wasmtime_wit(input);
  assert("Ok" in out && out.Ok.res == "3.0");
});
