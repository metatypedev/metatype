// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Func } from "../types.ts";
import { runtimes } from "../wit.ts";
import { Runtime } from "./mod.ts";

export class GrpcRuntime extends Runtime {
  constructor(protoFile: string, endpoint: string) {
    const protoFileContent = new TextDecoder().decode(
      Deno.readFileSync(protoFile),
    );
    const id = runtimes.registerGrpcRuntime({
      protoFileContent,
      endpoint,
    });
    super(id);
  }

  call(method: string) {
    const funcData = runtimes.callGrpcMethod(this._id, { method: method });
    return Func.fromTypeFunc(funcData);
  }
}
