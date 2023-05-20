// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, test } from "../utils.ts";

test("Random", async (t) => {
  const e = await t.pythonFile("random/random.py");

  await t.should("work", async () => {
    await gql`
      query {
        randomRec {
          uuid
          int
          str
          email
        }
      }
    `
      .expectData({
        randomRec: {
          uuid: "1069ace0-cdb1-5c1f-8193-81f53d29da35",
          int: 7457276839329792,
          str: "HPFk*o570)7",
          email: "vi@itabefir.bb",
        },
      })
      .on(e);
  });

  await t.should("work with custom generation params", async () => {
    await gql`
      query {
        randomUser {
          id
          name
          age
          address {
            street
            city
            postcode
            country
          }
        }
      }
    `
      .expectData({
        randomUser: {
          id: "415013d6-efc5-5781-aa74-056ee27dbb22",
          name: "Gertrude Robertson",
          age: 61,
          address: {
            street: "579 Dico Turnpike",
            city: "Igpisi",
            postcode: "NR1 5GS",
            country: "Croatia",
          },
        },
      })
      .on(e);
  });

  await t.should("work for nested arrays", async () => {
    await gql`
      query {
        randomList {
          array_of_array_of_names
        }
      }
    `.expectData(
      {
        randomList: {
          array_of_array_of_names: [
            [
              "Clayton Tate",
              "Martin Neal",
              "Charlie Soto",
              "Jared Ramirez",
              "Hilda Bowers",
              "Derek French",
            ],
            [
              "Jessie Garza",
              "Ricardo Maxwell",
              "Phillip Curtis",
              "Wesley Sparks",
              "Russell Lucas",
              "Tillie Cohen",
              "Herman Burgess",
              "Carolyn Potter",
              "Howard Patton",
              "Ethan Brady",
            ],
          ],
        },
      },
    )
      .on(e);
  });
});
