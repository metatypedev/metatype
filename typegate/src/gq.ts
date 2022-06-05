import type * as ast from "https://cdn.skypack.dev/graphql@16.2.0/language/ast?dts";

export const gq = async (
  url: string,
  query: ast.DocumentNode | string,
  variables: Record<string, unknown>
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
