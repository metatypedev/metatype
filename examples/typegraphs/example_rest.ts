// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.ts";

await typegraph(
  {
    name: "example-rest",
    dynamic: false,
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const deno = new DenoRuntime();
    const pub = Policy.public();

    const user = t.struct({ id: t.integer() }, { name: "User" });

    const post = t.struct(
      {
        id: t.integer(),
        author: user,
      },
      { name: "Post" },
    );
    //  skip:end

    g.expose({
      postFromUser: deno
        .func(user, post, { code: "(_) => ({ id: 12, author: {id: 1}  })" })
        .withPolicy(pub),
    });

    // In this example, the query below maps to {typegate_url}/example-rest/rest/get_post?id=..
    // highlight-start
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
    // highlight-end
    // skip:start
  },
);
