// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { fx, Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.ts";
import { RandomRuntime } from "@typegraph/sdk/runtimes/random.ts";

const genPost = () => ({
  id: "69099108-e48b-43c9-ad02-c6514eaad6e3",
  slug: "hair",
  title: "I dyed my hair!",
});

const _genPosts = () => [
  { slug: "hair", title: "I dyed my hair!" },
  { slug: "hello", title: "Hello World!" },
];

export const tg = await typegraph({
  name: "sample",
  builder(g) {
    const random = new RandomRuntime({ seed: 0 });
    const deno = new DenoRuntime();

    const post = t.struct({
      id: t.uuid({ asId: true, config: { auto: true } }),
      slug: t.string(),
      title: t.string(),
    }, { name: "post" });

    const user = t.struct({
      id: t.uuid({ asId: true, config: { auto: true } }),
      email: t.email(),
      posts: t.list(g.ref("post")),
    }, { name: "user" });

    const compositeUnion = t.union([post, user]);
    const scalarUnion = t.union([t.string(), t.integer()]);
    const mixedUnion = t.union([post, user, t.string(), t.integer()]);

    g.expose(
      {
        getUser: random.gen(user),
        getPosts: random.gen(post),

        scalarNoArgs: random.gen(t.string()),
        scalarArgs: deno.func(
          post,
          t.string(),
          {
            code: () => "hello",
            effect: fx.update(),
          },
        ),
        compositeNoArgs: deno.func(t.struct({}), post, {
          code: genPost,
          effect: fx.update(),
        }),
        compositeArgs: deno.func(
          t.struct({ id: t.string() }),
          post,
          {
            code: genPost,
            effect: fx.update(),
          },
        ),
        scalarUnion: deno.func(
          t.struct({ id: t.string() }),
          scalarUnion,
          {
            code: () => "hello",
          },
        ),
        compositeUnion: deno.func(
          t.struct({ id: t.string() }),
          compositeUnion,
          {
            code: genPost,
          },
        ),
        mixedUnion: deno.func(
          t.struct({ id: t.string() }),
          mixedUnion,
          {
            code: () => "hello",
          },
        ),
      },
      Policy.public(),
    );
  },
}).catch((err) => {
  console.log(err);
  throw err;
});
