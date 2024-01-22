import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

typegraph({
  name: "example-rest",
  dynamic: false,
}, (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  const user = t.struct({ "id": t.integer() });

  const post = t.struct(
    {
      "id": t.integer(),
      "author": user,
    },
  );

  // API docs {typegate_url}/example-rest/rest
  // In this example, the query below maps to {typegate_url}/example-rest/rest/get_post?id=..
  g.rest(
    `
        query get_post($id: Integer) {
            postFromUser(id: $id) {
                id
                author {
                    id
                }
            }
        }
    `,
  );

  g.expose({
    postFromUser: deno.func(
      user,
      post,
      { code: "(_) => ({ id: 12, author: {id: 1}  })" },
    ).withPolicy(pub),
  });
});
