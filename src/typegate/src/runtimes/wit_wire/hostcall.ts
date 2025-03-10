// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import * as zod from "zod";
import type { Typegate } from "../../typegate/mod.ts";
import { getLogger } from "../../log.ts";

const logger = getLogger(import.meta);

export type HostCallCtx = {
  typegate: Typegate;
  authToken: string;
  typegraphUrl: URL;
};

export async function hostcall(cx: HostCallCtx, op_name: string, json: string) {
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
    variables: zod.union([
      zod.string(),
      zod.record(zod.string(), zod.unknown()),
    ]),
  });

  const parseRes = argsValidator.safeParse(args);
  if (!parseRes.success) {
    throw new Error("error validating gql args", {
      cause: {
        zodErr: parseRes.error,
        args
      },
    });
  }
  const parsed = parseRes.data;

  // Convert variables to an object if it's a string
  let variables = parsed.variables;
  if (typeof variables === "string") {
    try {
      variables = JSON.parse(variables);
    } catch (error) {
      throw new Error("Failed to parse variables string as JSON", {
        cause: error,
      });
    }
  }

  const request = new Request(cx.typegraphUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${cx.authToken}`,
    },
    body: JSON.stringify({
      query: parsed.query,
      variables: variables,
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
