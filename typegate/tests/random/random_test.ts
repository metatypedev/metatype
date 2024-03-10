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
          email: "vu@jel.ml",
          int: 7360602246742016,
          str: "v%vijM",
          uuid: "415013d6-efc5-5781-aa74-056ee27dbb22",
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
          age: 35,
          id: "190a524b-b70b-52f4-911d-7974ea74cf43",
          name: "Chase Dennis",
          address: {
            city: "Peehhiz",
            country: "Mexico",
            postcode: "TA2G 2CP",
            street: "103 Pafma Circle",
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
                "Ethel Casey",
                "Della Garner",
                "Ronald Wade",
                "Clayton Tate",
                "Martin Neal",
                "Charlie Soto",
              ],
              [
                "Jessie Fleming",
              ],
              [
                "Bertha Watts",
                "Cecelia Neal",
                "Gabriel Ramirez",
                "Jean Carpenter",
                "Alfred Jenkins",
                "Cecilia Bradley",
                "Lee Potter",
                "Eunice Cox",
              ],
              [
                "Mable Leonard",
                "Belle Olson",
                "Susie Hart",
                "Nelle Banks",
                "Loretta Davis",
                "Delia Love",
                "Jeffrey Adkins",
                "Laura Harvey",
                "Jeffery Figueroa",
              ],
              [
                "Arthur Patton",
                "Minerva Miles",
                "James Maldonado",
                "Myrtle Gardner",
                "Evelyn Brown",
              ],
              [
                "Belle Dean",
                "Lilly Steele",
                "Michael Mason",
                "Gussie Burgess",
                "Rosalie Adams",
                "Cody Gray",
                "Olivia Alexander",
                "Lola Scott",
                "Miguel Pearson",
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
          country: "Turkey",
          email: "mummer@nubi.no",
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
          x: -158908830187.52,
          y: 59745273852.7232,
          z: -544843873281.6384,
        },
        toy: {
          color: "]W3wuH6qhfHI^h",
        },
        cents: 1,
        educationLevel: "primary",
      },
    }).on(e);
  });
});
