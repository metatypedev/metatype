// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { MetaTest } from "../../../utils/test.ts";
import * as path from "std/path/mod.ts";
import { assertEquals, assertExists } from "std/assert/mod.ts";

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
        ...(Deno.env.get("MCLI_LOADER_PY")?.split(" ") ?? ["python3"]),
        pythonDeploy,
        scriptsPath,
        port.toString(),
      ];
      const deployResult = await t.shell(deployCommand);
      if (deployResult.code !== 0) {
        console.error("Typegraph Deploy Script Failed: ", deployResult.stderr);
      }

      assertExists(deployResult.stdout, "Typegraph is serialized");
    });

    await t.should("remove typegraph from typegate", async () => {
      const pythonRemove = path.join(scriptsPath, "prog_remove.py");
      const removeCommand = [
        ...(Deno.env.get("MCLI_LOADER_PY")?.split(" ") ?? ["python3"]),
        pythonRemove,
        port.toString(),
      ];
      const removeResult = await t.shell(removeCommand);
      if (removeResult.code !== 0) {
        console.error("Typegraph Remove Script Failed: ", removeResult.stderr);
      }
      assertEquals(
        removeResult.stdout,
        "{'data': {'removeTypegraphs': True}}\n",
      );
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
        port.toString(),
      ];
      const deployResult = await t.shell(deployCommand);
      if (deployResult.code !== 0) {
        console.error("Typegraph Deploy Script Failed: ", deployResult.stderr);
      }
      assertExists(deployResult.stdout, "Typegraph is serialized");
      console.log(deployResult.stdout);
    });

    await t.should("remove typegraph from typegate", async () => {
      const tsRemove = path.join(scriptsPath, "prog_remove.ts");
      const removeCommand = [
        "deno",
        "run",
        "-A",
        tsRemove,
        port.toString(),
      ];
      const removeResult = await t.shell(removeCommand);
      if (removeResult.code !== 0) {
        console.error("Typegraph Remove Script Failed: ", removeResult.stderr);
      }
      assertEquals(
        removeResult.stdout,
        "{ data: { removeTypegraphs: true } }\n",
      );
    });
  },
);
