// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { WitWireMatInfo } from "../../../engine/runtime.js";
import type { ResolverArgs } from "../../types.ts";
import { Meta } from "../../../engine/runtime.js";
// import { getLogger } from "../../log.ts";
//
// const logger = getLogger(import.meta);

const METATYPE_VERSION = "0.5.1-rc.6";

export class WitWireHandle {
  static async init(params: {
    componentPath: string;
    id: string;
    ops: WitWireMatInfo[];
    hostcall: (op: string, json: string) => Promise<any>;
  }) {
    const { id, componentPath, ops, hostcall } = params;

    try {
      const _res = await Meta.wit_wire.init(
        componentPath,
        id,
        {
          expected_ops: ops,
          metatype_version: METATYPE_VERSION,
        }, // this callback will be used from the native end
        hostcall,
      );
      return new WitWireHandle(id, componentPath, ops);
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
  ) {}

  async handle(opName: string, args: ResolverArgs) {
    const { _, ...inJson } = args;
    const { id, componentPath, ops } = this;

    let res;
    try {
      res = await Meta.wit_wire.handle(id, {
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
            component: componentPath,
            err,
          },
        },
      );
    }
    if (typeof res == "string") {
      if (res == "NoHandler") {
        throw new Error(
          `materializer doesn't implement handler for op ${opName}`,
          {
            cause: {
              opName,
              args: inJson,
              component: componentPath,
              ops,
            },
          },
        );
      } else {
        throw new Error(`unexpected mat result for op ${opName}: ${res}`, {
          cause: {
            opName,
            args: inJson,
            component: componentPath,
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
            component: componentPath,
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
            component: componentPath,
          },
        },
      );
    }
  }
}
