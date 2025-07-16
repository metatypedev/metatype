// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { type Materializer, Runtime } from "./mod.ts";
import * as t from "../types.ts";
import { runtimes } from "../sdk.ts";
import type { Effect, KvMaterializer } from "../gen/runtimes.ts";
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
    const mad_id = runtimes.kvOperation(
      {
        runtime: this._id,
        effect: effect,
      },
      operation,
    );

    return new KvOperationMat(mad_id, operation);
  }

  set(): t.Func<
    t.Struct<{ key: t.String; value: t.String }>,
    t.String,
    KvOperationMat
  > {
    const mat = this.#operation("set", fx.update());
    return t.func(
      t.struct({ key: t.string(), value: t.string() }),
      t.string(),
      mat,
    );
  }

  get(): t.Func<t.Struct<{ key: t.String }>, t.Optional, KvOperationMat> {
    const mat = this.#operation("get", fx.read());
    // FIXME: consolidate response type construction inside tg_core
    return t.func(t.struct({ key: t.string() }), t.string().optional(), mat);
  }

  delete(): t.Func<t.Struct<{ key: t.String }>, t.Integer, KvOperationMat> {
    const mat = this.#operation("delete", fx.delete_());
    return t.func(t.struct({ key: t.string() }), t.integer(), mat);
  }

  keys(): t.Func<t.Struct<{ filter: t.Optional }>, t.List, KvOperationMat> {
    const mat = this.#operation("keys", fx.read());
    return t.func(
      t.struct({ filter: t.string().optional() }),
      t.list(t.string()),
      mat,
    );
  }

  values(): t.Func<t.Struct<{ filter: t.Optional }>, t.List, KvOperationMat> {
    const mat = this.#operation("values", fx.read());
    return t.func(
      t.struct({ filter: t.string().optional() }),
      t.list(t.string()),
      mat,
    );
  }

  lpush(): t.Func<
    t.Struct<{ key: t.String; value: t.String }>,
    t.Integer,
    KvOperationMat
  > {
    const mat = this.#operation("lpush", fx.update());
    return t.func(
      t.struct({ key: t.string(), value: t.string() }),
      t.integer(),
      mat,
    );
  }

  rpush(): t.Func<
    t.Struct<{ key: t.String; value: t.String }>,
    t.Integer,
    KvOperationMat
  > {
    const mat = this.#operation("rpush", fx.update());
    return t.func(
      t.struct({ key: t.string(), value: t.string() }),
      t.integer(),
      mat,
    );
  }

  lpop(): t.Func<t.Struct<{ key: t.String }>, t.Optional, KvOperationMat> {
    const mat = this.#operation("lpop", fx.update());
    return t.func(t.struct({ key: t.string() }), t.string().optional(), mat);
  }

  rpop(): t.Func<t.Struct<{ key: t.String }>, t.Optional, KvOperationMat> {
    const mat = this.#operation("rpop", fx.update());
    return t.func(t.struct({ key: t.string() }), t.string().optional(), mat);
  }
}
