// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraph, TypeGraphDS } from "../typegraph/mod.ts";
import { globalConfig } from "../config.ts";
import * as semver from "std/semver/mod.ts";

const typegraphVersion = "0.0.3";

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
};

export function isTypegraphUpToDate(typegraph: TypeGraphDS): boolean {
  const { meta } = typegraph;
  return semver.equals(
    semver.parse(typegraphVersion),
    semver.parse(meta.version),
  );
}

export function upgradeTypegraph(typegraph: TypeGraphDS): TypeGraphDS {
  const typegraphName = TypeGraph.formatName(typegraph);
  const { meta } = typegraph;

  let currentVersion = meta.version;
  while (
    semver.notEquals(
      semver.parse(typegraphVersion),
      semver.parse(currentVersion),
    )
  ) {
    const migration = typegraphChangelog[currentVersion];
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
