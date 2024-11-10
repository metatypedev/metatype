// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { dirname, join } from "@std/path";

import { expandGlob } from "@std/fs/expand-glob";
import * as yaml from "@std/yaml";
import * as graphql from "graphql";
import { exists } from "@std/fs/exists";
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

    test(
      { name: `Auto-tests for ${name}`, introspection: true },
      async (t) => {
        const e = await t.engine(pythonFile.path, {
          secrets,
          autoSecretName: false,
        });
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

        await t.should(
          `introspect field types schema for ${pythonFile.path}`,
          async () => {
            await gql`
          query IntrospectionQuery {
            __schema {
              types {
                name
                inputFields { name }
                fields { name }
                description
              }
            }
          }
        `.matchSnapshot(t)
              .on(e);
          },
        );
      },
    );
  }
}
