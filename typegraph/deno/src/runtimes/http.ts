// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.ts";
import {
  Effect,
  HttpMethod,
  MaterializerHttpRequest,
} from "../gen/interfaces/metatype-typegraph-runtimes.d.ts";
import { runtimes } from "../wit.ts";
import { Materializer, Runtime } from "./mod.ts";
import { fx } from "../mod.ts";

type HttpRequestMat<M extends string> =
  & Materializer
  & Omit<MaterializerHttpRequest, "method">
  & {
    method: M;
  };

export class HttpRuntime extends Runtime {
  constructor(
    public endpoint: string,
    public certSecret?: string,
    public basicAuthSecret?: string,
  ) {
    super(runtimes.registerHttpRuntime({
      endpoint,
      certSecret,
      basicAuthSecret,
    }));
  }

  #request<
    M extends HttpMethod,
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    method: M,
    inp: I,
    out: O,
    options: Omit<MaterializerHttpRequest, "method">,
    effect: Effect,
  ): t.Func<P, I, O> {
    const matId = runtimes.httpRequest({
      runtime: this._id,
      effect,
    }, { method, ...options });

    const mat: HttpRequestMat<M> = {
      _id: matId,
      method,
      ...options,
    };
    return t.func(inp, out, mat);
  }

  get<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    options: Omit<MaterializerHttpRequest, "method">,
  ): t.Func<P, I, O> {
    return this.#request("get", inp, out, options, fx.read());
  }

  post<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    options: Omit<MaterializerHttpRequest, "method">,
    effect?: Effect,
  ): t.Func<P, I, O> {
    return this.#request("get", inp, out, options, effect ?? fx.create());
  }

  put<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    options: Omit<MaterializerHttpRequest, "method">,
    effect?: Effect,
  ): t.Func<P, I, O> {
    return this.#request("get", inp, out, options, effect ?? fx.update());
  }

  patch<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    options: Omit<MaterializerHttpRequest, "method">,
    effect?: Effect,
  ): t.Func<P, I, O> {
    return this.#request("patch", inp, out, options, effect ?? fx.update());
  }

  delete_<
    P extends Record<string, t.Typedef> = Record<string, t.Typedef>,
    I extends t.Struct<P> = t.Struct<P>,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    options: Omit<MaterializerHttpRequest, "method">,
    effect?: Effect,
  ): t.Func<P, I, O> {
    return this.#request("get", inp, out, options, effect ?? fx.delete_());
  }
}
