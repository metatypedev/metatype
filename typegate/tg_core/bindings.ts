// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export type FormatCodeInp = {
  source: string;
};
export type FormatCodeOut =
  | {
    Ok: {
      formatted_code: string;
    };
  }
  | {
    Err: {
      message: string;
    };
  };

export function typescript_format_code(input: FormatCodeInp) {
  try {
    const out = Meta.typescriptFormatCode(input.source);
    return {
      Ok: {
        formatted_code: out,
      },
    };
  } catch (err) {
    if (typeof err == "string") {
      return {
        Err: {
          message: err,
        },
      };
    }
    throw err;
  }
}

export type ValidateInput = {
  obj: any;
};
export type ValidateResult = {
  error: string | undefined | null;
};

export function validate_prisma_runtime_data(
  a0: ValidateInput,
): ValidateResult {
  try {
    Meta.validatePrismaRuntimeData(a0.obj);
    return {};
  } catch (err) {
    return { error: err.toString() };
  }
}
export type TypegraphValidateInp = {
  json: string;
};
export type TypegraphValidateOut =
  | {
    Valid: {
      json: string;
    };
  }
  | {
    NotValid: {
      reason: string;
    };
  };

export function typegraph_validate(
  a0: TypegraphValidateInp,
): TypegraphValidateOut {
  try {
    const res = Meta.typegraphValidate(a0.json);
    return { Valid: { json: res } };
  } catch (err) {
    return {
      NotValid: {
        reason: err.toString(),
      },
    };
  }
}

const assert = (val) => {
  if (!val) throw Error("assertion failed");
};

const _dbg = (val) => {
  console.log("DBG: ", val);
  return val;
};

Deno.test("typescriptFormatCode", () => {
  const source = "console.log( {hello: 'world'})";

  assert(
    Meta.typescriptFormatCode(source) ===
      `console.log({ hello: "world" });\n`,
  );

  const out = typescript_format_code({ source });
  assert(out.Ok.formatted_code === `console.log({ hello: "world" });\n`);
});

Deno.test("validatePrismaRuntimeData", () => {
  const json = {
    name: "my_prisma",
    connection_string_secret: "secret",
    models: [],
    relationships: [],
  };
  Meta.validatePrismaRuntimeData(json);

  const out = validate_prisma_runtime_data({ obj: json });
  assert(!out.error);
});

Deno.test("typegraphValidate", () => {
  const json = {
    "$id": "https://metatype.dev/specs/0.0.3.json",
    "types": [
      {
        "type": "object",
        "title": "introspection",
        "runtime": 0,
        "policies": [],
        "config": {},
        "as_id": false,
        "properties": {
          "__type": 1,
          "__schema": 64,
        },
        "required": [
          "__type",
          "__schema",
        ],
      },
      {
        "type": "function",
        "title": "func_79",
        "runtime": 1,
        "policies": [
          0,
        ],
        "config": {},
        "as_id": false,
        "input": 2,
        "output": 4,
        "materializer": 0,
        "rate_weight": null,
        "rate_calls": false,
      },
    ],
    "materializers": [
      {
        "name": "getType",
        "runtime": 1,
        "effect": {
          "effect": "read",
          "idempotent": true,
        },
        "data": {},
      },
    ],
    "runtimes": [
      {
        "name": "deno",
        "data": {
          "worker": "default",
          "permissions": {},
        },
      },
      {
        "name": "typegraph",
        "data": {},
      },
    ],
    "policies": [
      {
        "name": "__public",
        "materializer": 2,
      },
    ],
    "meta": {
      "prefix": null,
      "secrets": [],
      "queries": {
        "dynamic": true,
        "endpoints": [],
      },
      "cors": {
        "allow_origin": [],
        "allow_headers": [],
        "expose_headers": [],
        "allow_methods": [],
        "allow_credentials": true,
        "max_age_sec": null,
      },
      "auths": [],
      "rate": null,
      "version": "0.0.3",
    },
  };
  const str = JSON.stringify(json);
  assert(JSON.stringify(JSON.parse(Meta.typegraphValidate(str))) == str);

  const out = typegraph_validate({ json: str });
  assert(JSON.stringify(JSON.parse(out.Valid.json)) == str);
});
