// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname, join } from "std/path/mod.ts";

import { expandGlob } from "std/fs/expand_glob.ts";
import * as yaml from "std/yaml/mod.ts";
import * as graphql from "graphql";
import { exists } from "std/fs/exists.ts";
import { dropSchemas, recreateMigrations } from "./migrations.ts";

import { test } from "./test.ts";
import { gql } from "./mod.ts";

async function findInParents(
  dir: string,
  names: string[],
): Promise<string | null> {
  let current = dir;
  while (true) {
    for (const name of names) {
      const candidate = join(current, name);
      if (await exists(candidate)) {
        return candidate;
      }
    }

    const parent = dirname(current);
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export async function autoTest(rootDir: string, target = "dev") {
  for await (
    const pythonFile of expandGlob("**/*.py", {
      root: rootDir,
      globstar: true,
    })
  ) {
    const dir = dirname(pythonFile.path);
    const name = pythonFile.name.replace(".py", "");

    const graphqlFiles: Record<string, string> = {};
    for await (
      const graphqlFile of expandGlob(`**/${name}*.graphql`, {
        root: dir,
        globstar: true,
      })
    ) {
      graphqlFiles[graphqlFile.name] = await Deno.readTextFile(
        graphqlFile.path,
      );
    }

    if (Object.keys(graphqlFiles).length === 0) {
      continue;
    }

    const configFile = await findInParents(dir, [
      "metatype.yml",
      "metatype.yaml",
    ]);

    if (configFile === null) {
      throw new Error(`Cannot find config file for ${name}`);
    }

    const config = yaml.parse(await Deno.readTextFile(configFile)) as any;
    const secrets = config.typegates[target]?.env ?? {};

    test(`Auto-tests for ${name}`, async (t) => {
      const e = await t.pythonFile(pythonFile.path, { secrets });
      await dropSchemas(e);
      await recreateMigrations(e);

      for (const [name, graphqlFile] of Object.entries(graphqlFiles)) {
        await t.should(
          `run case ${name}`,
          async () => {
            const doc = graphql.parse(graphqlFile);
            for (const operation of doc.definitions) {
              const query = graphql.print(operation);
              await gql([query])
                .matchSnapshot(t)
                .on(e);
            }
          },
        );
      }
    });
  }
}
