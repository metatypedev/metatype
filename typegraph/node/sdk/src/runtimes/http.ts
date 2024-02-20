// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as t from "../types.js";
import {
  Effect,
  HttpMethod,
  MaterializerHttpRequest,
} from "../gen/interfaces/metatype-typegraph-runtimes.js";
import { runtimes } from "../wit.js";
import { Materializer, Runtime } from "./mod.js";
import { fx } from "../index.js";

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
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    method: M,
    inp: I,
    out: O,
    options: Omit<MaterializerHttpRequest, "method">,
    effect: Effect,
  ): t.Func<I, O> {
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
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    options: Omit<MaterializerHttpRequest, "method">,
  ): t.Func<I, O> {
    return this.#request("get", inp, out, options, fx.read());
  }

  post<
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    options: Omit<MaterializerHttpRequest, "method">,
    effect?: Effect,
  ): t.Func<I, O> {
    return this.#request("get", inp, out, options, effect ?? fx.create());
  }

  put<
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    options: Omit<MaterializerHttpRequest, "method">,
    effect?: Effect,
  ): t.Func<I, O> {
    return this.#request("get", inp, out, options, effect ?? fx.update());
  }

  patch<
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    options: Omit<MaterializerHttpRequest, "method">,
    effect?: Effect,
  ): t.Func<I, O> {
    return this.#request("patch", inp, out, options, effect ?? fx.update());
  }

  delete_<
    I extends t.Typedef = t.Typedef,
    O extends t.Typedef = t.Typedef,
  >(
    inp: I,
    out: O,
    options: Omit<MaterializerHttpRequest, "method">,
    effect?: Effect,
  ): t.Func<I, O> {
    return this.#request("get", inp, out, options, effect ?? fx.delete_());
  }
}
