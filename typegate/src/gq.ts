// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import * as ast from "graphql/ast";

export const gq = async (
  url: string,
  query: ast.DocumentNode | string,
  variables: Record<string, unknown>,
) => {
  const q =
    typeof query !== "string" && "kind" in query && query.kind === "Document"
      ? query.loc?.source.body
      : query;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: q,
      variables,
    }),
  });
  return res.json();
};
