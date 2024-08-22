// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { expandGlobSync } from "std/fs/expand_glob.ts";
import { Meta } from "../utils/mod.ts";
import { join } from "std/path/mod.ts";
import { JSONSchemaFaker } from "json-schema-faker";
import Ajv from "ajv";
import { assertNotStrictEquals } from "std/assert/mod.ts";
import { upgradeTypegraph } from "../../src/typegraph/versions.ts";
import { testDir } from "../utils/dir.ts";

const ajv = new Ajv({ allErrors: true, useDefaults: true, strict: false });
ajv.addFormat("uint32", (x) => typeof x === "number" && x >= 0 && x <= 2 ** 32);
ajv.addFormat(
  "int32",
  (x) => typeof x === "number" && x >= -(2 ** 31) && x <= 2 ** 31,
);
ajv.addFormat("double", (x) => typeof x === "number" && !isNaN(x));

JSONSchemaFaker.option({
  fixedProbabilities: true,
  minItems: 1,
  maxItems: 5,
  maxLength: 20,
});

Meta.test("typegraphs creation", async (t) => {
  const folder = join(testDir, "../../website/static/specs");
  const specs = Array.from(
    expandGlobSync("*.json", {
      root: folder,
      includeDirs: false,
      globstar: true,
    }),
  );

  for (let i = 1; i < specs.length; i += 1) {
    const from = specs[i - 1];
    const to = specs[i];

    const fromVersion = from.name.replace(".json", "");
    const toVersion = to.name.replace(".json", "");
    const fromSpec = await Deno.readTextFile(from.path);
    //const toSpec = await Deno.readTextFile(to.path);

    await t.should(`migrate from ${fromVersion} to ${toVersion}`, () => {
      const fromJson = JSON.parse(fromSpec);
      /*
      const toJson = JSON.parse(toSpec);
      const fromValidate = ajv.compile(fromJson);
      const toValidate = ajv.compile(toJson);
    */

      for (let j = 0; j < 100; j += 1) {
        const fromData = JSONSchemaFaker.generate(fromJson);
        fromData.meta.version = fromVersion;
        /*
        const fromCheck = fromValidate(fromData);
        assertEquals(
          fromCheck,
          true,
          `errors: ${JSON.stringify(fromValidate.errors)} in ${
            JSON.stringify(fromData)
          }}`,
        );
        */

        const toData = upgradeTypegraph(structuredClone(fromData));
        toData.meta.version = toVersion;
        assertNotStrictEquals(fromData, toData);

        /*
        const toCheck = toValidate(toData);
        assertEquals(
          toCheck,
          true,
          `errors: ${JSON.stringify(toValidate.errors)} in ${
            JSON.stringify(toData)
          }`,
        );
        */
      }
    });
  }
});
