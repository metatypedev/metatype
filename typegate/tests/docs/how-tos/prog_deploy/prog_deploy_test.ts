// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { MetaTest } from "../../../utils/test.ts";
import * as path from "std/path/mod.ts";

Meta.test(
  {
    name: "Programmatic deployment test - Python SDK",
  },
  async (t: MetaTest) => {
    const port = t.port;
    const scriptsPath = path.join(t.workingDir, "docs/how-tos/prog_deploy");

    await t.should("deploy python typegraph to typegate", async () => {
      const pythonDeploy = path.join(scriptsPath, "prog_deploy.py");
      const deployCommand = [
        ...(
          Deno.env.get("MCLI_LOADER_PY")?.split(" ") ??
            ["python3"]
        ),
        pythonDeploy,
        port,
        scriptsPath,
      ];
      const deployResult = await t.meta(deployCommand);
      if (deployResult.code !== 0) {
        console.error("Typegraph Deploy Script Failed: ", deployResult.stderr);
      }
    });

    await t.should("remove typegraph from typegate", async () => {
      const pythonRemove = path.join(scriptsPath, "prog_remove.py");
      const removeCommand = [
        "deno",
        "run",
        "-A",
        pythonRemove,
        scriptsPath,
        port,
      ];
      const removeResult = await t.meta(removeCommand);
      if (removeResult.code !== 0) {
        console.error("Typegraph Remove Script Failed: ", removeResult.stderr);
      }
    });
  },
);

Meta.test(
  {
    name: "Programmatic deployment test - TS SDK",
  },
  async (t: MetaTest) => {
    const port = t.port;
    const scriptsPath = path.join(t.workingDir, "docs/how-tos/prog_deploy");

    await t.should("deploy typegraph to typegate", async () => {
      const tsDeploy = path.join(scriptsPath, "prog_deploy.ts");
      const deployCommand = [
        "deno",
        "run",
        "-A",
        tsDeploy,
        scriptsPath,
        port,
      ];
      const deployResult = await t.meta(deployCommand);
      if (deployResult.code !== 0) {
        console.error("Typegraph Deploy Script Failed: ", deployResult.stderr);
      }
    });

    await t.should("remove typegraph from typegate", async () => {
      const tsRemove = path.join(scriptsPath, "prog_remove.ts");
      const removeCommand = [
        "deno",
        "run",
        "-A",
        tsRemove,
        scriptsPath,
        port,
      ];
      const removeResult = await t.meta(removeCommand);
      if (removeResult.code !== 0) {
        console.error("Typegraph Remove Script Failed: ", removeResult.stderr);
      }
    });
  },
);
