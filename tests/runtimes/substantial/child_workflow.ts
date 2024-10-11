import { Context } from "./imports/common_types.ts";

function apply(pkg: string, oldVersion: string, newVersion: string) {
  console.info(
    `Updating ${pkg} v${oldVersion} => ${pkg} v${newVersion}: applied`
  );
}

export async function bumpPackage(ctx: Context) {
  const { pkg, version } = ctx.kwargs;
  const newVersion = await ctx.save(() => version + 1);
  await ctx.save(() => apply(pkg, version, newVersion));

  ctx.sleep(2000);

  return `Now using ${pkg} v${version}`;
}

export async function bumpAll(ctx: Context) {
  const { packages } = ctx.kwargs;

  const handlersDef = await ctx.save(async () => {
    const handlersDef = [];
    for (const pkg of packages) {
      const handleDef = await ctx.startChildWorkflow(bumpPackage, {
        pkg,
        version: 1,
      });
      handlersDef.push(handleDef);
    }

    return handlersDef;
  });

  const handles = handlersDef.map((def) => ctx.createWorkflowHandle(def));

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

  return ret.join(", ");
}
