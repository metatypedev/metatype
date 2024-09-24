import { QueryGraph } from "./client.ts";

const api1 = new QueryGraph();

const gqlClient = api1.graphql(
  `http://localhost:${Deno.env.get("TG_PORT")}/sample`,
);

const res3 = await gqlClient.mutation({
  upload: api1.upload({
    file: new File(["hello world"], "hello.txt", { type: "text/plain" }),
  }),
});

const res4 = await gqlClient.mutation({
  uploadMany: api1.uploadMany({
    files: [1, 2, 3, 4].map((i) =>
      new File([`hello #${i}`], `hello-${i}.txt`, { type: "text/plain" })
    ),
  }),
});

console.log(JSON.stringify([res3, res4]));
