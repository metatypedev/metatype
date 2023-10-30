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
    const out = Meta.typescript_format_code(input.source);
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

Deno.test("typescript_format_code", () => {
  const out = typescript_format_code({
    source: "console.log( {hello: 'world'})",
  });
  Meta.assert(out.Ok.formatted_code === `console.log({ hello: "world" });\n`);
});
