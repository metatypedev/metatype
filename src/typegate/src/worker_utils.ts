// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// WARNING: Assume any content or state in this file will run inside a Web Worker

export class HostcallPump {
  #pendingHostCalls = new Map<string, PromiseWithResolvers<any>>();

  handleResponse(resp: { id: string; result: any; error: any }) {
    const promise = this.#pendingHostCalls.get(resp.id);
    if (!promise) {
      throw new Error("unknown hostcall id");
    }
    this.#pendingHostCalls.delete(resp.id);
    if (resp.error) {
      promise.reject(resp.error);
    } else {
      promise.resolve(resp.result);
    }
  }

  newHandler(
    hostcall: (id: string, opName: string, json: string) => void,
  ) {
    const gql = (query: readonly string[], ...args: unknown[]) => {
      if (args.length > 0) {
        throw new Error(
          "gql does not support arguments, use variables instead",
        );
      }
      // console.log(query);
      return {
        run: (
          variables: Record<string, unknown>,
        ): Promise<Record<string, unknown>> => {
          const id = crypto.randomUUID();
          const promise = Promise.withResolvers<any>();
          this.#pendingHostCalls.set(id, promise);

          hostcall(id, "gql", JSON.stringify({ query, variables }));
          return promise.promise;
        },
      };
    };
    return { gql };
  }
}

export function errorToString(err: unknown) {
  if (err instanceof Error) {
    return err.message;
  } else {
    return JSON.stringify(err);
  }
}
