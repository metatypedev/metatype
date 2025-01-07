// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  get_version,
  typegraph_validate,
  validate_prisma_runtime_data,
} from "native";
import { assert, assertEquals } from "@std/assert";

// deno-lint-ignore no-unused-vars
function dbg<T>(val: T) {
  console.log("DBG: ", val);
  return val;
}

Deno.test("version", () => {
  assertEquals(typeof Meta.version(), "string");
  assertEquals(typeof get_version(), "string");
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
    "types": [
      {
        "type": "object",
        "title": "introspection",
        "properties": {
          "__type": 1,
          "__schema": 26
        },
        "id": [],
        "required": [
          "__type",
          "__schema"
        ],
        "policies": {
          "__type": [
            0
          ],
          "__schema": [
            0
          ]
        }
      },
      {
        "type": "function",
        "title": "func_79",
        "input": 2,
        "output": 4,
        "runtimeConfig": null,
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
  const str = JSON.stringify(json, null, 2);
  assertEquals(
    JSON.stringify(JSON.parse(Meta.typegraphValidate(str)), null, 2),
    str,
  );

  const out = typegraph_validate({ json: str });
  assert("Valid" in out);
  assertEquals(JSON.stringify(JSON.parse(out.Valid.json), null, 2), str);
});
