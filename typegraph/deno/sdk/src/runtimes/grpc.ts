// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Effect, GrpcMaterializer } from "../gen/typegraph_core.d.ts";
import * as t from "../types.ts";
import { runtimes } from "../wit.ts";
import { Materializer, Runtime } from "./mod.ts";

class CallGrpcMethodMat implements Materializer {
  mat: GrpcMaterializer;
  _id: number;
  constructor(id: number, mat: GrpcMaterializer) {
    this._id = id;
    this.mat = mat;
  }
}

export class GrpcRuntime extends Runtime {
  constructor() {
    const id = runtimes.registerGrpcRuntime();
    super(id);
  }

  call_grpc_method(
    proto_file: string,
    method: string,
    endpoint: string,
    fx: Effect,
  ) {
    const grpc_materializer: GrpcMaterializer = {
      protoFile: proto_file,
      method: method,
      endpoint: endpoint,
    };
    const mat_id = runtimes.callGrpcMethode(
      { runtime: this._id, effect: fx },
      grpc_materializer,
    );

    const mat = new CallGrpcMethodMat(mat_id, grpc_materializer);

    return t.func(
      t.struct({ "payload": t.string().optional() }),
      t.string(),
      mat,
    );
  }
}
