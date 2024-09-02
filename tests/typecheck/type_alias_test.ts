// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test("Random", async (t) => {
  const e = await t.engine("typecheck/type_alias.py");

  await t.should("validate and work with a basic alias", async () => {
    await gql`
      query {
        get_message {
          a: id
          title
          B: user_id
        }
      }
    `
      .expectData({
        get_message: {
          B: -6252260489166848,
          a: -6940119625891840,
          title: "(eHAQ*ECr4%5Qwa5T",
        },
      })
      .on(e);
  });

  await t.should(
    "validate and work when all nodes have an alias",
    async () => {
      await gql`
      query {
        one: get_message {
          two: id
          three: title
          four: user_id
        }
      }
    `
        .expectData({
          one: {
            four: 7781716965982208,
            three: "ye12M52^m",
            two: 2221033285222400,
          },
        })
        .on(e);
    },
  );

  await t.should("validate and work with non-trivial aliases", async () => {
    await gql`
      query {
        some_alias: get_message {
          some_id: id
          title
        }
        get_message {
          user_id
          info {
            title: label
            content
          }
        }
        some_alias_2: get_message {
          some_title: title
        }
        some_alias_3: get_message {
          some_title: title
        }
      }
    `
      .expectData({
        some_alias: { some_id: -8923192479449088, title: "tXIHACrEbD" },
        get_message: {
          user_id: 6379176739209216,
          info: [
            { content: "c(3]DC39H[", title: "Rg!mCL36" },
            { content: "RJXJg7]D5%]c", title: "%Oq(27tcP0jIB" },
            { content: "5cj1TYaTNhau(5%", title: "gqLtZgHFAi8Ud7CZH42z" },
            { content: "6L^0kflTn9UZ^P]@032", title: "!uF88WUak2fSbYeRHQi" },
          ],
        },
        some_alias_2: { some_title: "KB2bni&" },
        some_alias_3: { some_title: "S#4]L*K" },
      })
      .on(e);
  });
});
