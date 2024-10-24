// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "test-utils/mod.ts";

Meta.test("Python: Random", async (t) => {
  const e = await t.engine("runtimes/random/random_.py");

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
          email: "vi@itabefir.bb",
          int: 7457276839329792,
          str: "HPFk*o570)7",
          uuid: "1069ace0-cdb1-5c1f-8193-81f53d29da35",
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
          age: 61,
          id: "415013d6-efc5-5781-aa74-056ee27dbb22",
          name: "Gertrude Robertson",
          address: {
            city: "Igpisi",
            country: "Croatia",
            postcode: "NR1 5GS",
            street: "579 Dico Turnpike",
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
                "Lydia Atkins",
                "Stella Parker",
                "Daisy Chavez",
                "Essie Franklin",
                "Betty Gill",
                "Susan Reeves",
                "Rosa Hansen",
                "Blanche White",
                "Essie Marsh",
              ],
              [
                "Inez Meyer",
                "Ophelia Hayes",
                "Bernice Delgado",
                "Bernice Rose",
                "Rena Vargas",
              ],
              [
                "Marguerite Tyler",
                "Adeline Robinson",
                "Lucy King",
                "Essie Collins",
                "Henrietta Cummings",
                "Esther Wade",
                "Rena Holmes",
                "Louise Warner",
                "Gussie Castillo",
              ],
              [
                "Lelia Curry",
              ],
              [
                "Lelia Daniels",
                "Augusta Webster",
                "Hattie Baker",
                "Sophia Owen",
                "Caroline Poole",
                "Catherine Ward",
                "Margaret Perez",
                "Verna Wallace",
                "Flora Daniels",
                "Cornelia Allen",
              ],
            ],
          },
        },
      )
      .on(e);
  });
});

Meta.test("Deno: Random", async (t) => {
  const e = await t.engine("runtimes/random/random.ts");

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
          country: "Guyana",
          email: "wubju@de.cg",
        },
      })
      .on(e);
  });

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
    `.expectData({
      test2: {
        field: {
          B: 784597442048.8192,
          G: -185967195874.9184,
          R: 305787281657.0368,
        },
        toy: {
          color: "FxYMpG#qcNX^EHPFk*",
        },
        cents: 1,
        educationLevel: "primary",
      },
    }).on(e);
  });
});
