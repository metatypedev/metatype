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

export async function concurrentBump(ctx: Context) {
  const { packages } = ctx.kwargs;

  const handles = await ctx.save(async () => {
    // A handle exactly matches to a runId on the implementation
    const handles = [];
    for (const pkg of packages) {
      const handle = ctx.childWorkflow(bumpPackage, pkg);
      handles.push(handle);

      // Maps to a mutation { _internalResult(name: "bumpPackage", kwargs: { pkg: .. } ) }
      await handle.start();
    }
    return handles;
  });

  await ctx.ensure(async () => {
    for (const handle of handles) {
      // Maps to query { _internalResult(runId: "...") != null }
      if (!(await handle.hasStopped())) {
        return false;
      }
    }
    return true;
  });

  const ret = await ctx.save(() =>
    Promise.all(handles.map((h) => h.result<string>()))
  );

  return ret;
}
