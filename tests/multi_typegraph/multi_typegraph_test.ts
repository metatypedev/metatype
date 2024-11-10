// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "../utils/mod.ts";
import * as mf from "test/mock_fetch";

mf.install();

function generatePost(id: number) {
  return {
    id,
    title: "My first post",
    summary: "This is my first post",
    content: "Lorem ipsum dolor sit amet, in sit docendi constituto.",
  };
}

const ALL_POSTS = [1, 2, 4, 7, 12, 34, 67].map(generatePost);

const tsTgPath = "multi_typegraph/multi_typegraph.ts";
Meta.test("Deno: Multi-typegraph file - Random typegraph", async (t) => {
  const e = await t.engine(tsTgPath, { typegraph: "randomTg" });

  await t.should("work on enum, union, and either types", async () => {
    await gql`
      query {
        test2 {
          field {
            ... on Rgb {
              R
              G
              B
            }
            ... on Vec {
              x
              y
              z
            }
          }
          toy {
            ... on Rubix {
              name
              size
            }
            ... on Toygun {
              color
            }
          }
          educationLevel
          cents
        }
      }
    `
      .expectData({
        test2: {
          field: {
            B: 779226068287.488,
            G: 396901315143.2704,
            R: 895648526657.1263,
          },
          toy: {
            name: "w]krgDn",
            size: -2019220594360320,
          },
          cents: 1,
          educationLevel: "secondary",
        },
      })
      .on(e);
  });
});

Meta.test(
  {
    name: "Multi-typegraph file - PythonRuntime - Deno: def, lambda",
  },
  async (t) => {
    const e = await t.engine(tsTgPath, { typegraph: "python" });

    await t.should("work with def", async () => {
      await gql`
        query {
          identityLambda(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
        }
      `
        .expectData({
          identityLambda: {
            a: "hello",
            b: [1, 2, "three"],
          },
        })
        .on(e);
    });

    await t.should("work with def", async () => {
      await gql`
        query {
          identityDef(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
        }
      `
        .expectData({
          identityDef: {
            a: "hello",
            b: [1, 2, "three"],
          },
        })
        .on(e);
    });
  },
);

Meta.test(
  {
    name: "Multi-typegraph - Python SDK",
  },
  async (metaTest) => {
    const engine = await metaTest.engine("multi_typegraph/multi_typegraph.py", {
      typegraph: "http_py",
    });
    mf.mock("GET@/api/posts", (req) => {
      const tags = new URL(req.url).searchParams.getAll("tags");
      const posts = tags.reduce((list, tag) => {
        switch (tag) {
          case "even":
            return list.filter((p) => p.id % 2 === 0);
          case "m3":
            return list.filter((p) => p.id % 3 === 0);
          default:
            return list;
        }
      }, ALL_POSTS);
      return new Response(JSON.stringify(posts), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    await metaTest.should("work with simple request", async () => {
      await gql`
        query {
          posts {
            id
            title
            summary
            content
          }
        }
      `
        .expectData({
          posts: ALL_POSTS,
        })
        .on(engine);
    });
  },
);
