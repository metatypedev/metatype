// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// NOTE: https://github.com/ajv-validator/ajv-formats/issues/85
import Ajv from "https://esm.sh/ajv@8.12.0";
import addFormats from "https://esm.sh/ajv-formats@3.0.1";

import { parse } from "npm:yaml";
import schema from "@local/tools/schema/metatype.json" with { type: "json" };
import * as path from "@std/path";
import { assert } from "@std/assert";
import { Meta } from "test-utils/mod.ts";

const files = [
  "../metatype.yml",
  "../../examples/metatype.yaml",
  "../../examples/templates/deno/metatype.yaml",
  "../../examples/templates/node/metatype.yaml",
  "../../examples/templates/python/metatype.yaml",
  "../metagen/typegraphs/sample/metatype.yml",
  "../metagen/typegraphs/identities/metatype.yml",
];

Meta.test("Configuration schema", () => {
  const ajv = new Ajv();

  addFormats(ajv);

  const validate = ajv.compile(schema);
  const scriptDir = import.meta.dirname!;

  for (const file of files) {
    const relativePath = path.resolve(scriptDir, file);
    const yaml = Deno.readTextFileSync(relativePath);
    const parsed = parse(yaml);
    const result = validate(parsed);

    assert(result, `validation failed for '${file}'`);
  }
});
