// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Func } from "../types.ts";
import { runtimes } from "../sdk.ts";
import { Runtime } from "./mod.ts";

export class GrpcRuntime extends Runtime {
  constructor(protoFile: string, endpoint: string) {
    const id = runtimes.registerGrpcRuntime({
      protoFile,
      endpoint,
    });
    super(id);
  }

  call(method: string) {
    const funcData = runtimes.callGrpcMethod(this._id, { method: method });
    return Func.fromTypeFunc(funcData);
  }
}
