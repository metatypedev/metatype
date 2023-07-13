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
          a: -1494798787674112,
          title: "1*ajw]krgDnCzXD*N!Fx",
          B: 3336617896968192,
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
            two: 442220385665024,
            three: "G#qcNX^E",
            four: -770929621729280,
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
        some_alias: { some_id: 1057261938016256, title: "k*o570)7xgZ" },
        get_message: {
          user_id: 327007237832704,
          info: [
            { title: "%9g9cume#XhRFX(ENo", content: "V1j$ZUV3Az4tA%3F$" },
            { title: "vxkY59Ebc3U]W3wu", content: "aXKUfi6(eHAQ*ECr4%5Q" },
            { title: "6qhfHI^hv%vi", content: "a5TlyQNa$" },
            { title: "MbgY^p^", content: "AI^4UIbt&9ZO]fmI" },
            { title: "wKRdPQTk(", content: "2*oZIer" },
            { title: "tZrhNE(ZKEOd4N", content: "L3p&d0MjmbDbhcLsh" },
            { title: "XkM6*", content: "vNrO)!ujrugRQ)EPBb" },
            { title: "R$%Ok", content: "7vr17TCF@33FPFkAel" },
            { title: "k%7BDNmW&AzQ", content: "*d^h5q" },
          ],
        },
        some_alias_2: { some_title: "0cPWajfv)AQupf" },
        some_alias_3: { some_title: "l3lo*RB)d" },
      })
      .on(e);
  });
});
