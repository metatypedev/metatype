import { ComputeStage } from "../engine.ts";
import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { Resolver, Runtime, RuntimeConfig } from "./Runtime.ts";
import { RuntimeInitParams } from "./Runtime.ts";

const dummy: Resolver = ({ a }: { a: number }) => {
  return {
    out: a * 2,
    a: 2,
    b: null,
    nested: () => ({
      ok: 0,
    }),
  };
};

const map: Record<string, Resolver> = {
  function: dummy,
  identity: ({ _, ...x }) => JSON.parse(JSON.stringify(x)),
};

export class DenoRuntime extends Runtime {
  static singleton: DenoRuntime | null = null;

  private constructor() {
    super();
  }

  static init(params: RuntimeInitParams): Runtime {
    if (!DenoRuntime.singleton) {
      DenoRuntime.singleton = new DenoRuntime();
    }
    return DenoRuntime.singleton;
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
    const resolver: Resolver = (() => {
      if (stage.props.node === "__typename") {
        return () => stage.props.outType.name;
      }

      if (stage.props.materializer?.data.name) {
        return map[stage.props.materializer.data.name as string];
      }

      const mat = stage.props.materializer;
      if (mat?.name === "deno_module") {
        const { code } = mat.data as { code: string };
        return async ({ _: { context }, ...args }) => {
          const file = await Deno.makeTempFile({ suffix: ".ts" });
          await Deno.writeTextFile(file, code);
          const mod = await import(file);
          const res = await mod.default(args, context);
          await Deno.remove(file);
          return res;
        };
      }

      return ({ _: { parent } }) => {
        const resolver = parent[stage.props.node];
        const ret = typeof resolver === "function" ? resolver() : resolver;
        return ret;
      };
    })();

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }
}
