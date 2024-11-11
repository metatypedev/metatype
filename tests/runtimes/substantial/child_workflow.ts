// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Context } from "./imports/common_types.ts";

function apply(pkg: string, oldVersion: string, newVersion: string) {
  console.info(
    `Updating ${pkg} v${oldVersion} => ${pkg} v${newVersion}: applied`,
  );
}

export async function bumpPackage(ctx: Context) {
  const { name, version } = ctx.kwargs;
  const newVersion = await ctx.save(() => version + 1);
  await ctx.save(() => apply(name, version, newVersion));

  ctx.sleep(5000);

  return `Bump ${name} v${version} => v${newVersion}`;
}

export async function bumpAll(ctx: Context) {
  const { packages } = ctx.kwargs;

  // step 1: always save when starting a child as it produces effects
  // (preferably per start, which is not the case here)
  const handlersDef = await ctx.save(async () => {
    const handlersDef = [];
    for (const { name, version } of packages) {
      const handleDef = await ctx.startChildWorkflow(bumpPackage, {
        name,
        version,
      });

      handlersDef.push(handleDef);
    }

    return handlersDef;
  });

  // step 2: create a workflow handle using the data generated from startChildWorkflow
  const handles = handlersDef.map((def) => ctx.createWorkflowHandle(def));

  // step 3: use ensure to block until conditional function call is truthy
  // The workflow is not required to wait on its children but in our case we want to retrieve all children outputs
  await ctx.ensure(async () => {
    for (const handle of handles) {
      if (!(await handle.hasStopped())) {
        return false;
      }
    }
    return true;
  });

  const ret = await ctx.save(async () => {
    const ret = [];
    for (const handle of handles) {
      const childResult = await handle.result<string>();
      ret.push(childResult);
    }

    return ret;
  });

  return ret.sort((a, b) => a.localeCompare(b));
}
