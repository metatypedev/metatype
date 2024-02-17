// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../../utils/mod.ts";

Meta.test("Python: Random Injection", async (metaTest) => {
  const engine = await metaTest.engine("random/injection/random_injection.py");

  await metaTest.should("generate random values", async () => {
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
          birthday: "2124-06-22T19:00:07.302Z",
          phone: "(587) 901-3720",
          gender: "Male",
          firstname: "Landon",
          lastname: "Mengoni",
          friends: ["Hettie", "Mary", "Sean", "Ethel", "Joshua"],
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

  await metaTest.should("work on random lists", async () => {
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
          "Nicholas Mills",
          "Ethel Marshall",
          "Phillip Gonzales",
          "Russell Barber",
        ],
      },
    }).on(engine);
  });
});

Meta.test("Deno: Random Injection", async (metaTest) => {
  const engine = await metaTest.engine("random/injection/random_injection.ts");

  await metaTest.should("work", async () => {
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
          birthday: "2124-06-22T19:00:07.302Z",
          phone: "(587) 901-3720",
          gender: "Male",
          firstname: "Landon",
          lastname: "Mengoni",
          friends: [
            "Hettie Huff",
            "Nicholas Mills",
            "Ethel Marshall",
            "Phillip Gonzales",
            "Russell Barber",
          ],
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
