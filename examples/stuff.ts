import { fx, Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.ts";

const genUser = () => ({
  id: "69099108-e48b-43c9-ad02-c6514eaad6e3",
  email: "yuse@mail.box",
});

const genPosts = () => [
  { slug: "hair", title: "I dyed my hair!" },
  { slug: "hello", title: "Hello World!" },
];

await typegraph({
  name: "sample",
  builder(g) {
    const deno = new DenoRuntime();
    const post = t.struct({
      slug: t.string(),
      title: t.string(),
    }, { name: "Post" });

    const getPosts = deno.func(
      t.struct({ filter: t.string().optional() }).rename("GetPostsInput"),
      t.list(post),
      {
        code: genPosts,
        effect: fx.read(),
      },
    ).withPolicy(Policy.public());

    const user = t.struct({
      id: t.uuid(),
      email: t.email(),
      posts: getPosts,
    }, { name: "User" });

    g.expose(
      {
        getUser: deno.func(
          t.struct({ id: t.string() }).rename("GetUserInput"),
          user,
          {
            code: genUser,
            effect: fx.read(),
          },
        ),
        getPosts,

        noArgs: deno.func(t.struct({}), user, { code: genUser }),
        scalar: deno.func(t.struct({ name: t.string() )}), t.string(), {
          code: ({name}) => `hello ${name}`,
        }),
      },
      Policy.public(),
    );
  },
}).catch((err) => {
  console.log(err);
  throw err;
});
