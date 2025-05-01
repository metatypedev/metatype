// import { t } from "@typegraph/sdk";
// import { log } from "@typegraph/sdk/io";
// import { TypegraphBuilderArgs } from "@typegraph/sdk/typegraph";
import { t } from "@typegraph/sdk";
import { log } from "@typegraph/sdk/io";
import { TypegraphBuilderArgs } from "@typegraph/sdk/typegraph";

export function dbg<T>(val: T, ...ctx: unknown[]) {
  log.debug("DBG", val, ...ctx);
  return val;
}

export function rack<
  T extends Record<string, D>,
  D extends t.Typedef | ((keys: Record<keyof T, string>) => t.Typedef),
>(inp: T) {
  const keys = Object.fromEntries(
    Object.keys(inp).map((key) => [key, key]),
  ) as Record<keyof T, string>;
  return Object.fromEntries(
    Object.entries(inp).map(([name, def]) => {
      const val = typeof def == "function" ? def(keys) : (def as t.Typedef);
      return [name, val.rename(name)];
    }),
  ) as Record<keyof T, t.Typedef>;
}

// FIXME: multiple expose calls destroy the PrismaContext leading
// to loss of models
export function rootBuilder(
  g: TypegraphBuilderArgs,
  defaultPolicy?: t.PolicySpec | Array<t.PolicySpec>,
) {
  const sets = [] as {
    funcs: Record<string, t.Func>;
    defPol: t.PolicySpec | Array<t.PolicySpec> | undefined;
  }[];
  return {
    expose(
      funcs: Record<string, t.Func>,
      defPol?: t.PolicySpec | Array<t.PolicySpec>,
    ) {
      sets.push({ funcs, defPol });
    },
    [Symbol.dispose]: () => {
      const finalSet = sets.reduce(
        (total, set) => {
          for (const [name, fn] of Object.entries(set.funcs)) {
            if (total[name]) {
              throw new Error(`root function clash under name ${name}`);
            }
            total[name] =
              // we only apply policy if the set was given a separate def policy
              fn.policy || !set.defPol ? fn : fn.withPolicy(set.defPol);
          }
          return total;
        },
        {} as Record<string, t.Func>,
      );
      g.expose(finalSet, defaultPolicy);
    },
  };
}
