// Copyright Metatype under the Elastic License 2.0.

import { ComputeStage } from "../engine.ts";
import { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { Resolver, Runtime, RuntimeConfig } from "./Runtime.ts";
import { RuntimeInitParams } from "./Runtime.ts";
import * as ast from "graphql_ast";
import { StructNode } from "../type_node.ts";

export class GoogleapisRuntime extends Runtime {
  constructor() {
    super();
  }

  static init(_params: RuntimeInitParams): Runtime {
    return new GoogleapisRuntime();
  }

  async deinit(): Promise<void> {}

  execute(method: string, urlTemplate: string, readMask: string): Resolver {
    return async ({ _: { context }, ...args }) => {
      let url = urlTemplate;
      const payload: Record<string, unknown> = {};

      for (const [arg, value] of Object.entries(args)) {
        const tag = `{+${arg}}`;
        if (url.includes(tag)) {
          url = url.replace(tag, value as string);
        } else {
          payload[arg] = value;
        }
      }

      const query = new URLSearchParams({ read_mask: readMask });
      const input = `${url}?${query}`;
      const opts = {
        method,
        headers: {
          authorization: context["authorization"],
        },
      };

      console.log(input, opts);
      const ret = await fetch(input, opts);
      const res = await ret.json();
      console.log(JSON.stringify(res));
      return res;
    };
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] {
    const stagesMat: ComputeStage[] = [];

    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);
    const { verb, url } = stage.props.materializer?.data ?? {};

    const outType = stage.props.outType as StructNode;
    const iteratorReadMask = outType.data.binds &&
      outType.data.binds.nextPageToken &&
      outType.data.binds.totalSize;

    const readMask: string[] = [];
    for (const field of sameRuntime) {
      const path = field.props.path
        .slice(stage.props.path.length + (iteratorReadMask ? 1 : 0))
        .join(".");
      readMask.push(path);
    }

    readMask.sort();
    for (let i = 0; i < readMask.length - 1;) {
      const a = readMask[i];
      const b = readMask[i + 1];
      if (b.startsWith(a)) {
        readMask.splice(i, 1);
      } else {
        i += 1;
      }
    }

    const queryStage = new ComputeStage({
      ...stage.props,
      resolver: this.execute(verb as string, url as string, readMask.join(",")),
    });

    stagesMat.push(queryStage);

    console.log("===", stage.props);
    console.log(sameRuntime);

    for (const field of sameRuntime) {
      if (field.props.parent?.id() === stage.props.parent?.id()) {
        throw Error("Not implemented.");
      } else {
        const resolver: Resolver = ({ _: { parent } }) => {
          return parent[field.props.node] ?? null;
        };
        stagesMat.push(
          new ComputeStage({
            ...field.props,
            dependencies: [...field.props.dependencies, queryStage.id()],
            resolver,
          }),
        );
      }
    }
    return stagesMat;
  }
}
