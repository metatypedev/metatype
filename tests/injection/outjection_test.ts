import { gql, Meta } from "test-utils/mod.ts";

Meta.test("outjection", async (t) => {
  const e = await t.engine("injection/outjection.py", {
    secrets: {
      "user_password": "my-unguessable-super-secret",
    },
  });

  await t.should("return context value", async () => {
    await gql`
      query {
        randomUser {
          id
          age
          email
          password
          createdAt
          firstPost {
            title
            publisherEmail
          }
        }
      }
    `
      .withContext({ user_email: "johndoe@example.com" })
      .expectData({
        randomUser: {
          id: "",
          age: 19,
          email: "johndoe@example.com",
          password: "my-unguessable-super-secret",
          createdAt: "what",
          firstPost: {
            title: "",
            publisherEmail: "johndoe@example.com",
          },
        },
      })
      .on(e);
  });
});
