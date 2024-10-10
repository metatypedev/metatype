// Assume any line of code bellow in this file runs inside a Web Worker

import { TaskContext } from "./runtimes/deno/shared_types.ts";

export function make_internal(
  { meta: { url, token } }: TaskContext,
  additionalHeaders: Record<string, string>
) {
  const gql = (query: readonly string[], ...args: unknown[]) => {
    if (args.length > 0) {
      throw new Error("gql does not support arguments, use variables instead");
    }
    // console.log(query);
    return {
      run: async (
        variables: Record<string, unknown>
      ): Promise<Record<string, unknown>> => {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
            ...additionalHeaders,
          },
          body: JSON.stringify({
            query: query[0],
            variables,
          }),
        });
        if (!res.ok) {
          throw new Error(`gql fetch on ${url} failed: ${await res.text()}`);
        }
        // console.log
        return res.json();
      },
    };
  };
  return { gql };
}
