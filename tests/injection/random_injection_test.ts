// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "test-utils/mod.ts";

const cases = [
  {
    key: "python",
    typegraph: "injection/random_injection.py",
    testName: "Python: Random injection",
  },
  {
    key: "deno",
    typegraph: "injection/random_injection.ts",
    testName: "Deno: Random injection",
  },
];

for (const testCase of cases) {
  Meta.test({
    name: testCase.testName,
    only: false,
  }, async (t) => {
    const engine = await t.engine(testCase.typegraph);

    await t.should("generate random values", async () => {
      await gql`
        query {
          randomUser {
            id
            ean
            name
            age
            married
            birthday
            phone
            gender
            firstname
            lastname
            friends
            occupation
            street
            city
            postcode
            country
            uri
            hostname
          }
        }
      `
        .expectData({
          randomUser: {
            id: "1069ace0-cdb1-5c1f-8193-81f53d29da35",
            ean: "0497901391205",
            name: "Landon Glover",
            age: 38,
            married: true,
            birthday: "2124-06-22T22:00:07.302Z",
            phone: "(587) 901-3720",
            gender: "Male",
            firstname: "Landon",
            lastname: "Mengoni",
            friends: ["Hettie", "Mary", "Lydia", "Ethel", "Jennie"],
            occupation: "Health Care Manager",
            street: "837 Wubju Drive",
            city: "Urbahfec",
            postcode: "IM9 9AD",
            country: "Indonesia",
            uri: "http://wubju.bs/ma",
            hostname: "wubju.bs",
          },
        })
        .on(engine);
    });
  });
}

Meta.test("random injection on unions", async (t) => {
  const engine = await t.engine("injection/random_injection.py");

  await t.should("work on random lists", async () => {
    await gql`
            query {
                randomList {
                    names
                }
            }
        `.expectData({
      randomList: {
        names: [
          "Hettie Huff",
          "Ada Mills",
          "Ethel Marshall",
          "Emily Gonzales",
          "Lottie Barber",
        ],
      },
    }).on(engine);
  });

  await t.should(
    "generate random values for enums, either and union variants",
    async () => {
      await gql`
      query {
        testEnumStr {
          educationLevel
        },
        testEnumInt {
          bits
        },
        testEnumFloat {
          cents
        },
        testEither {
          toy {
            ... on Toygun {
              color
            }
            ... on Rubix {
              name,
              size
            }
          }
        },
        testUnion {
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
        }
      }
    `.expectData({
        testEnumStr: {
          educationLevel: "secondary",
        },
        testEnumInt: {
          bits: 0,
        },
        testEnumFloat: {
          cents: 0.5,
        },
        testEither: {
          toy: {
            name: "1*ajw]krgDnCzXD*N!Fx",
            size: 3336617896968192,
          },
        },
        testUnion: {
          field: {
            B: 779226068287.488,
            G: 396901315143.2704,
            R: 895648526657.1263,
          },
        },
      }).on(engine);
    },
  );
});
