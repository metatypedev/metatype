// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test("Python: Random", async (t) => {
  const e = await t.engine("random/random.py");

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
    `
      .expectData(
        {
          randomList: {
            array_of_array_of_names: [
              [
                "Olivia Smith",
                "Sean Atkins",
                "Arthur Parker",
                "Jack Chavez",
                "Hunter Franklin",
                "Betty Gill",
                "Louis Reeves",
                "Rosa Hansen",
                "Blanche White",
                "Essie Marsh",
              ],
              [
                "Caleb Meyer",
                "Glen Hayes",
                "Bernice Delgado",
                "Bernice Rose",
                "Ronnie Vargas",
              ],
              [
                "Marguerite Tyler",
                "Erik Robinson",
                "Gregory King",
                "Essie Collins",
                "Henrietta Cummings",
                "Esther Wade",
                "Shane Holmes",
                "Jacob Warner",
                "Gussie Castillo",
              ],
              ["Julian Curry"],
              [
                "Lelia Daniels",
                "Gabriel Webster",
                "Ronald Baker",
                "Dale Owen",
                "Harry Poole",
                "Frank Ward",
                "Margaret Perez",
                "Verna Wallace",
                "Flora Daniels",
                "Derek Allen",
              ],
            ],
          },
        },
      )
      .on(e);
  });
});

Meta.test("Deno: Random", async (t) => {
  const e = await t.engine("random/random.ts");

  await t.should("work", async () => {
    await gql`
      query {
        test1 {
          email
          country
        }
      }
    `
      .expectData({
        test1: {
          email: "wubju@de.cg",
          country: "Guyana",
        },
      })
      .on(e);
  });
});
