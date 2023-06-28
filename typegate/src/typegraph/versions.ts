// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TypeGraph, TypeGraphDS, typegraphVersion } from "../typegraph.ts";
import config from "../config.ts";
import * as semver from "std/semver/mod.ts";

const typegraphChangelog: Record<
  string,
  { next: string; transform: (x: TypeGraphDS) => TypeGraphDS }
> = {
  "0.0.0": {
    "next": "0.0.1",
    "transform": (x) => x,
  },
};

export function upgradeTypegraph(typegraph: TypeGraphDS): TypeGraphDS {
  const typegraphName = TypeGraph.formatName(typegraph);
  const { meta } = typegraph;

  let currentVersion = meta.version;
  while (
    semver.neq(semver.parse(typegraphVersion), semver.parse(currentVersion))
  ) {
    const migration = typegraphChangelog[currentVersion];
    if (!migration) {
      throw Error(
        `typegate ${config.version} supports typegraph ${typegraphVersion} which is incompatible with ${typegraphName} ${meta.version} (max auto upgrade was ${currentVersion})`,
      );
    }
    typegraph = migration.transform(typegraph);
    currentVersion = migration.next;
  }

  return typegraph;
}
