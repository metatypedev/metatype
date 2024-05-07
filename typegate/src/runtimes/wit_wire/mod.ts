// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type { WitWireMatInfo } from "../../../engine/runtime.js";
import { ResolverArgs } from "../../types.ts";

export class WitWireMessenger {
  static async init(
    componentPath: string,
    instanceId: string,
    ops: WitWireMatInfo[],
  ) {
    try {
      const _res = await Meta.wit_wire.init(componentPath, instanceId, {
        expected_ops: ops,
        // FIXME: source actual version
        metatype_version: "0.3.7-0",
      });
      return new WitWireMessenger(instanceId, componentPath, ops);
    } catch (err) {
      throw new Error(
        `error on init for component at path: ${componentPath}: ${err}`,
        {
          cause: {
            componentPath,
            ops,
            err,
          },
        },
      );
    }
  }

  constructor(
    public id: string,
    public componentPath: string,
    public ops: WitWireMatInfo[],
  ) {
  }

  async [Symbol.asyncDispose]() {
    await Meta.wit_wire.destroy(this.id);
  }

  async handle(opName: string, args: ResolverArgs) {
    const { _, ...inJson } = args;
    let res;
    try {
      res = await Meta.wit_wire.handle(this.id, {
        op_name: opName,
        in_json: JSON.stringify(inJson),
      });
    } catch (err) {
      throw new Error(
        `unexpected error handling request for op ${opName}: ${err}`,
        {
          cause: {
            opName,
            args: inJson,
            component: this.componentPath,
            err,
          },
        },
      );
    }
    if (
      typeof res == "string"
    ) {
      if (res == "NoHandler") {
        throw new Error(
          `materializer doesn't implement handler for op ${opName}`,
          {
            cause: {
              opName,
              args: inJson,
              component: this.componentPath,
              ops: this.ops,
            },
          },
        );
      } else {
        throw new Error(`unexpected mat result for op ${opName}: ${res}`, {
          cause: {
            opName,
            args: inJson,
            component: this.componentPath,
          },
        });
      }
    } else if ("Ok" in res) {
      return JSON.parse(res.Ok);
    } else if ("InJsonErr" in res) {
      throw new Error(
        `materializer failed deserializing json args for op ${opName}: ${res.InJsonErr}`,
        {
          cause: {
            opName,
            args: inJson,
            component: this.componentPath,
          },
        },
      );
    } else {
      throw new Error(
        `materializer handler error for op ${opName}: ${res.HandlerErr}`,
        {
          cause: {
            opName,
            args: inJson,
            component: this.componentPath,
          },
        },
      );
    }
  }
}
