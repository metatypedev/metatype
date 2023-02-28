// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { ComputeStage } from "../engine.ts";
import { Runtime } from "./Runtime.ts";
import { ObjectNode } from "../type_node.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { getLogger } from "../log.ts";

const logger = getLogger(import.meta);

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
      const opts: RequestInit = {
        method,
        headers: {
          authorization: context["authorization"] as string, // FIXME
        },
      };

      logger.debug(input, opts);
      const ret = await fetch(input, opts);
      const res = await ret.json();
      logger.debug(JSON.stringify(res));
      return res;
    };
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const stagesMat: ComputeStage[] = [];

    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);
    const { verb, url } = stage.props.materializer?.data ?? {};

    const outType = stage.props.outType as ObjectNode;
    const iteratorReadMask = outType.properties &&
      outType.properties.nextPageToken &&
      outType.properties.totalSize;

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
