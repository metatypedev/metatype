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
  url: string;
  constructor(url: string) {
    const id = runtimes.registerKvRuntime({ url });
    super(id);
    this.url = url;
  }

  #operation(operation: KvMaterializer, effect: Effect) {
    const mad_id = runtimes.kvOperation({
      runtime: this._id,
      effect: effect,
    }, operation);

    return new KvOperationMat(mad_id, operation);
  }

  set() {
    const mat = this.#operation("set", fx.update(false));
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
    return t.func(t.struct({ "key": t.string() }), t.integer(), mat);
  }

  keys() {
    const mat = this.#operation("keys", fx.read());
    return t.func(
      t.struct({ "filter": t.string().optional() }),
      t.list(t.string()),
      mat,
    );
  }

  values() {
    const mat = this.#operation("values", fx.read());
    return t.func(
      t.struct({ "filter": t.string().optional() }),
      t.list(t.string()),
      mat,
    );
  }
}
