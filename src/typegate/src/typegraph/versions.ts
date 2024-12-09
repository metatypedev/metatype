// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypeGraph, type TypeGraphDS } from "../typegraph/mod.ts";
import { globalConfig } from "../config.ts";
import * as semver from "@std/semver";
import { ObjectNode, Type } from "./type_node.ts";

const typegraphVersion = "0.0.4";

const typegraphChangelog: Record<
  string,
  { next: string; transform: (x: any) => TypeGraphDS }
> = {
  "0.0.0": {
    "next": "0.0.1",
    "transform": (x) => x,
  },
  "0.0.1": {
    "next": "0.0.2",
    "transform": (x) => {
      x.meta.prefix = x.prefix;
      delete x.prefix;
      x.meta.queries = {
        dynamic: true,
        endpoints: [],
      };
      return x;
    },
  },
  "0.0.2": {
    "next": "0.0.3",
    "transform": (x) => {
      x.materializers.forEach((m: any) => {
        if (m.effet?.effect === "none") {
          m.effet.effect = "read";
        }
      });
      return x;
    },
  },
  "0.0.3": {
    "next": "0.0.4",
    "transform": (x) => {
      console.log("types", x.types.length);
      for (const typeNode of x.types) {
        if (typeNode.type === Type.FUNCTION) {
          // build injection tree from the input type
          const path: string[] = [];
          const input = x.types[typeNode.input];
          const traverse = (objectNode: ObjectNode) => {
            console.log({ path });
            const properties = objectNode.properties;
            for (const [name, typeIdx] of Object.entries(properties)) {
              path.push(name);
              const prop = x.types[typeIdx];
              if ("injection" in prop) {
                console.log({ injection: prop.injection, path });
                throw new Error("injection");
              }
              if (prop.type === Type.OBJECT) {
                traverse(prop);
              }
              path.pop();
            }
          };
          traverse(input);
          typeNode.injections = {};
        }
      }
      return x;
    },
  },
};

export function isTypegraphUpToDate(typegraph: TypeGraphDS): boolean {
  const { meta } = typegraph;
  console.log({ typegraphVersion, metaVersion: meta.version });
  return semver.equals(
    semver.parse(typegraphVersion),
    semver.parse(meta.version),
  );
}

export function upgradeTypegraph(typegraph: TypeGraphDS): TypeGraphDS {
  const typegraphName = TypeGraph.formatName(typegraph);
  const { meta } = typegraph;

  let currentVersion = meta.version;
  console.log("upgrade", { currentVersion, typegraphVersion });
  while (
    semver.notEquals(
      semver.parse(typegraphVersion),
      semver.parse(currentVersion),
    )
  ) {
    const migration = typegraphChangelog[currentVersion];
    console.log({ migration });
    if (!migration) {
      throw Error(
        `typegate ${globalConfig.version} supports typegraph ${typegraphVersion} which is incompatible with ${typegraphName} ${meta.version} (max auto upgrade was ${currentVersion})`,
      );
    }
    typegraph = migration.transform(typegraph);
    currentVersion = migration.next;
  }

  return typegraph;
}
