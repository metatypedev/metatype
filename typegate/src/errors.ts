// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { basename, dirname, extname } from "std/path/posix";
import { getLogger } from "./log.ts";
import { globalConfig } from "./config.ts";

const logger = getLogger(import.meta);

export enum ErrorKind {
  User = "user", // from user input -- 4xx
  Service = "service", // from foreign service -- 500, 503, 504
  Typegraph = "typegraph", // bad typegraph, should be fixed by the typegraph writer -- 500
  System = "system", // internal services
  Typegate = "typegate", // unexpected error (bug?) -- 500
}

export class BaseError extends Error {
  public module: string | null;
  public code: number;
  #type: string | null = null;

  constructor(
    module: ImportMeta | string | null,
    public kind: ErrorKind,
    message: string,
    code: number | null = null,
  ) {
    super(message);

    if (module != null && typeof module === "object") {
      const bname = basename(module.url);
      const dname = basename(dirname(module.url));
      this.module = `${dname}/${bname.replace(extname(bname), "")}`;
    } else {
      this.module = module;
    }

    if (!code) {
      switch (kind) {
        case ErrorKind.User:
          this.code = 400;
          break;
        default:
          this.code = 500;
      }
    } else {
      this.code = code;
    }
  }

  withType(type: string): this {
    this.#type = type;
    return this;
  }

  toResponse(
    headers: Headers = new Headers(),
    graphqlFormat = true,
  ): Response {
    const type = this.#type ?? this.constructor.name;
    logger.error(
      "{}[{}:{}]: {}",
      type,
      this.kind,
      this.module ?? "",
      this.message,
    );
    if (globalConfig.debug) {
      logger.error(this.stack);
    }
    logger.warn("Responding with HTTP {}", this.code);

    let responseObj;
    if (graphqlFormat) {
      // formatted in graphql error format
      // https://spec.graphql.org/draft/#sec-Errors.Error-Result-Format
      // for graphql endpoints
      responseObj = {
        errors: [
          {
            message: this.message,
            extensions: {
              module: this.module,
              kind: this.kind,
              type,
            },
          },
        ],
      };
    } else {
      // for non-graphql endpoints
      responseObj = {
        error: this.message,
        module: this.module,
        kind: this.kind,
        type,
      };
    }

    return new Response(JSON.stringify(responseObj), {
      status: this.code,
      headers: { "Content-Type": "application/json", ...headers },
    });
  }
}

export class TypegateError extends BaseError {
  constructor(module: ImportMeta | string, message: string) {
    const msgArr = [
      `Unexpected error from the typegate: ${message}`,
      `Please report this error to the Metatype maintainers.`,
    ];
    super(module, ErrorKind.Typegate, msgArr.join("\n"));
  }
}

export class UnknownError extends BaseError {
  constructor(error: unknown) {
    let errStr;
    if (error instanceof Error) {
      errStr = error.message;
    } else {
      errStr = JSON.stringify(error);
    }
    super(null, ErrorKind.Typegate, `Unknown error: ${errStr}`);
  }
}

export class TypegraphError extends BaseError {
  constructor(module: ImportMeta | string, message: string) {
    super(module, ErrorKind.Typegraph, `Typegraph error: ${message}`);
  }
}

export class NotImplemented extends BaseError {
  constructor(module: ImportMeta | string, message: string) {
    super(module, ErrorKind.Typegate, `Not implemented: ${message}`, 501);
  }
}

export class ResolverError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class BadContext extends Error {
  constructor(message: string) {
    super(message);
  }
}

export interface ErrorConstructor {
  new (message: string): BaseError;
}
