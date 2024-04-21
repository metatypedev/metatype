// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type { WitWireMatInfo } from "../../../engine/runtime.js";
import { ResolverArgs } from "../../types.ts";

export class WitWireMessenger {
  static async init(componentPath: string, id: string, ops: WitWireMatInfo[]) {
    try {
      const _res = await Meta.wit_wire.init(componentPath, id, {
        expected_ops: ops,
        metatype_version: "TODO",
      });
      return new WitWireMessenger(id);
    } catch (err) {
      throw new Error(`error on init for component at path: ${componentPath}`, {
        cause: {
          componentPath,
          ops,
          err,
        },
      });
    }
  }

  constructor(public id: string) {
  }

  async [Symbol.asyncDispose]() {
    await Meta.wit_wire.destroy(this.id);
  }

  async handle(opName: string, args: ResolverArgs) {
    const { _, ...inJson } = args;
    try {
      const res = await Meta.wit_wire.handle(this.id, {
        op_name: opName,
        in_json: JSON.stringify(inJson),
      });
      return JSON.parse(res);
    } catch (err) {
      throw new Error(`error handling request for op ${opName}`, {
        cause: {
          opName,
          args,
          err,
        },
      });
    }
  }
}
