// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

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
            B: 333661789696.8192,
            G: -336376534925.312,
            R: -145566213550.8992,
          },
          toy: {
            color: "PFk*o570)7xg",
          },
          cents: 0.5,
          educationLevel: "tertiary",
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
