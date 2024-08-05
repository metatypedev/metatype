// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Materializer, Runtime } from "./mod.ts";
import * as t from "../types.ts";
import { runtimes } from "../wit.ts";
import { Effect, KvMaterializer } from "../gen/typegraph_core.d.ts";

import { fx } from "../index.ts";

class KvOperationMat implements Materializer {
  operation: KvMaterializer;
  _id: number;
  constructor(id: number, operation: KvMaterializer) {
    this._id = id;
    this.operation = operation;
  }
}

export class KvRuntime extends Runtime {
  host: string;
  port?: string;
  dbNumber?: number;
  password?: string;

  constructor(
    { host, port, dbNumber, password }: {
      host: string;
      port?: string;
      dbNumber?: number;
      password?: string;
    },
  ) {
    const id = runtimes.registerKvRuntime({ host, port, dbNumber, password });
    super(id);
    this.host = host;
    this.port = port;
    this.dbNumber = dbNumber;
    this.password = password;
  }

  #operation(operation: KvMaterializer, effect: Effect) {
    const mad_id = runtimes.kvOperation({
      runtime: this._id,
      effect: effect,
    }, operation);

    return new KvOperationMat(mad_id, operation);
  }

  set() {
    const mat = this.#operation("set", fx.update());
    return t.func(
      t.struct({ "key": t.string(), "value": t.string() }),
      t.string(),
      mat,
    );
  }

  get() {
    const mat = this.#operation("get", fx.read());

    return t.func(t.struct({ "key": t.string() }), t.string(), mat);
  }

  delete() {
    const mat = this.#operation("delete", fx.delete_());

    return t.func(t.struct({ "key": t.string() }), t.string(), mat);
  }

  keys() {
    const mat = this.#operation("keys", fx.read());

    return t.func(
      t.struct({ "filter": t.optional(t.string()) }),
      t.list(t.string()),
      mat,
    );
  }
  all() {
    const mat = this.#operation("all", fx.read());

    return t.func(
      t.struct({ "filter": t.optional(t.string()) }),
      t.list(t.string()),
      mat,
    );
  }
}
