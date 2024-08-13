// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import * as zod from "zod";
import type { WitWireMatInfo } from "../../../engine/runtime.js";
import { ResolverArgs } from "../../types.ts";
import { Typegate } from "../../typegate/mod.ts";
import { getLogger } from "../../log.ts";

const logger = getLogger(import.meta);

const METATYPE_VERSION = "0.4.8-0";

export class WitWireMessenger {
  static async init(
    componentPath: string,
    instanceId: string,
    ops: WitWireMatInfo[],
    cx: HostCallCtx,
  ) {
    try {
      const _res = await Meta.wit_wire.init(
        componentPath,
        instanceId,
        {
          expected_ops: ops,
          metatype_version: METATYPE_VERSION,
        }, // this callback will be used from the native end
        async (op: string, json: string) => await hostcall(cx, op, json),
      );
      return new WitWireMessenger(instanceId, componentPath, ops);
    } catch (err) {
      throw new Error(
        `error on init for component at path: ${componentPath}: ${err}`,
        {
          cause: {
            componentPath,
            ops,
            err,
          },
        },
      );
    }
  }

  constructor(
    public id: string,
    public componentPath: string,
    public ops: WitWireMatInfo[],
  ) {
  }

  async [Symbol.asyncDispose]() {
    await Meta.wit_wire.destroy(this.id);
  }

  async handle(opName: string, args: ResolverArgs) {
    const { _, ...inJson } = args;
    let res;
    try {
      res = await Meta.wit_wire.handle(this.id, {
        op_name: opName,
        in_json: JSON.stringify(inJson),
      });
    } catch (err) {
      throw new Error(
        `unexpected error handling request for op ${opName}: ${err}`,
        {
          cause: {
            opName,
            args: inJson,
            component: this.componentPath,
            err,
          },
        },
      );
    }
    if (
      typeof res == "string"
    ) {
      if (res == "NoHandler") {
        throw new Error(
          `materializer doesn't implement handler for op ${opName}`,
          {
            cause: {
              opName,
              args: inJson,
              component: this.componentPath,
              ops: this.ops,
            },
          },
        );
      } else {
        throw new Error(`unexpected mat result for op ${opName}: ${res}`, {
          cause: {
            opName,
            args: inJson,
            component: this.componentPath,
          },
        });
      }
    } else if ("Ok" in res) {
      return JSON.parse(res.Ok);
    } else if ("InJsonErr" in res) {
      throw new Error(
        `materializer failed deserializing json args for op ${opName}: ${res.InJsonErr}`,
        {
          cause: {
            opName,
            args: inJson,
            component: this.componentPath,
          },
        },
      );
    } else {
      throw new Error(
        `materializer handler error for op ${opName}: ${res.HandlerErr}`,
        {
          cause: {
            opName,
            args: inJson,
            component: this.componentPath,
          },
        },
      );
    }
  }
}

export type HostCallCtx = {
  typegate: Typegate;
  authToken: string;
  typegraphUrl: URL;
};

async function hostcall(cx: HostCallCtx, op_name: string, json: string) {
  try {
    const args = JSON.parse(json);
    switch (op_name) {
      case "gql":
        return await gql(cx, args);
      default:
        throw new Error(`Unrecognized op_name ${op_name}`, {
          cause: {
            code: "op_404",
          },
        });
    }
  } catch (err) {
    logger.error("error on wit_wire hostcall {}", err);
    if (err instanceof Error) {
      throw {
        message: err.message,
        cause: err.cause,
        ...(typeof err.cause == "object" && err
          ? {
            // deno-lint-ignore no-explicit-any
            code: (err.cause as any).code ?? "unexpected_err",
          }
          : {
            code: "unexpected_err",
          }),
      };
    } else {
      throw {
        code: "unexpected_err",
        message: `Unpexpected error: ${Deno.inspect(err)}`,
      };
    }
  }
}

async function gql(cx: HostCallCtx, args: object) {
  const argsValidator = zod.object({
    query: zod.string(),
    variables: zod.record(zod.string(), zod.unknown()),
  });
  const parseRes = argsValidator.safeParse(args);
  if (!parseRes.success) {
    throw new Error("error validating gql args", {
      cause: {
        zodErr: parseRes.error,
      },
    });
  }
  const parsed = parseRes.data;
  const request = new Request(cx.typegraphUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${cx.authToken}`,
    },
    body: JSON.stringify({
      query: parsed.query,
      variables: parsed.variables,
    }),
  });
  //TODO: make `handle` more friendly to internal requests
  const res = await cx.typegate.handle(request, {
    port: 0,
    hostname: "internal",
    transport: "tcp",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`gql fetch on ${cx.typegraphUrl} failed: ${text}`, {
      cause: {
        response: text,
        typegraphUrl: cx.typegraphUrl,
        ...parsed,
      },
    });
  }
  return await res.json();
}
