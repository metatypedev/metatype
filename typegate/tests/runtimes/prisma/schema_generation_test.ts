// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { parseTypegraph } from "../../../src/typegraph/parser.ts";
import { serialize, test } from "../../utils.ts";
import { generateDatamodel } from "../../../src/runtimes/prisma/hooks/generate_schema.ts";
import * as PrismaRT from "../../../src/runtimes/prisma/types.ts";
import { assertEquals } from "std/testing/asserts.ts";
import outdent from "outdent";

async function assertGeneratedSchema(tgName: string, schema: string) {
  const tg = await parseTypegraph(
    await serialize("runtimes/prisma/schema_generation.py", {
      unique: true,
      typegraph: tgName,
    }),
  );

  const runtime = tg.runtimes.filter((rt) =>
    rt.name === "prisma"
  )[0] as PrismaRT.DS<PrismaRT.DataRaw>;

  assertEquals(
    generateDatamodel(tg, runtime.data),
    schema,
  );
}

test("schema generation", async (t) => {
  await t.should("generate datamodel for simple model", async () => {
    await assertGeneratedSchema(
      "simple-model",
      outdent`
        model User {
            id Int @id @default(autoincrement())
            name String
        }
      `,
    );
  });

  await t.should(
    "generate datamodel with one to many relationship",
    async () => {
      await assertGeneratedSchema(
        "one-to-many",
        outdent`
          model User {
              id Int @id
              posts Post[] @relation(name: "postAuthor")
          }

          model Post {
              id Int @id
              author User @relation(name: "postAuthor", fields: [authorId], references: [id])
              authorId Int
          }
        `,
      );

      await assertGeneratedSchema(
        "implicit-one-to-many",
        outdent`
          model User {
              id Int @id @default(autoincrement())
              posts Post[] @relation(name: "__rel_Post_User_1")
          }

          model Post {
              id Int @id @default(autoincrement())
              author User @relation(name: "__rel_Post_User_1", fields: [authorId], references: [id])
              authorId Int
          }
        `,
      );

      // TODO also reversed order version
    },
  );

  await t.should(
    "generate datamodel with optional one to many relationship",
    async () => {
      await assertGeneratedSchema(
        "optional-one-to-many",
        outdent`
          model User {
              id Int @id @default(autoincrement())
              posts Post[] @relation(name: "__rel_Post_User_1")
          }

          model Post {
              id Int @id @default(autoincrement())
              author User? @relation(name: "__rel_Post_User_1", fields: [authorId], references: [id])
              authorId Int?
          }
        `,
      );

      // TODO revered order
    },
  );

  await t.should(
    "generate datamodel with one to one relationship",
    async () => {
      await assertGeneratedSchema(
        "one-to-one",
        outdent`
          model User {
              id Int @id
              profile Profile? @relation(name: "userProfile")
          }

          model Profile {
              id String @db.Uuid @id @default(uuid())
              user User @relation(name: "userProfile", fields: [userId], references: [id])
              userId Int

              @@unique(userId)
          }
        `,
      );

      await assertGeneratedSchema(
        "implicit-one-to-one",
        outdent`
          model User {
              id Int @id @default(autoincrement())
              profile Profile? @relation(name: "__rel_Profile_User_1")
          }

          model Profile {
              id String @db.Uuid @id @default(uuid())
              user User @relation(name: "__rel_Profile_User_1", fields: [userId], references: [id])
              userId Int

              @@unique(userId)
          }
        `,
      );

      // TODO also reversed order version
    },
  );

  await t.should(
    "generate datamodel with optional one to one relationship",
    async () => {
      await assertGeneratedSchema(
        "optional-one-to-one",
        outdent`
          model User {
              id Int @id @default(autoincrement())
              profile Profile? @relation(name: "__rel_Profile_User_1")
          }

          model Profile {
              id String @db.Uuid @id @default(uuid())
              user User? @relation(name: "__rel_Profile_User_1", fields: [userId], references: [id])
              userId Int?

              @@unique(userId)
          }
        `,
      );

      // TODO revered order
    },
  );

  // // TODO fails optional one-to-one with ambiguous direction
  // //
  //
  await t.should(
    "generate datamodel with semi-implicit one to one relationship",
    async () => {
      await assertGeneratedSchema(
        "semi-implicit-one-to-one",
        outdent`
          model User {
              id Int @id
              profile Profile? @relation(name: "userProfile")
          }

          model Profile {
              id String @db.Uuid @id @default(uuid())
              user User @relation(name: "userProfile", fields: [userId], references: [id])
              userId Int

              @@unique(userId)
          }
        `,
      );

      await assertGeneratedSchema(
        "semi-implicit-one-to-one-2",
        outdent`
          model User {
              id Int @id
              profile Profile? @relation(name: "userProfile")
          }
      
          model Profile {
              id String @db.Uuid @id @default(uuid())
              user User @relation(name: "userProfile", fields: [userId], references: [id])
              userId Int

              @@unique(userId)
          }
        `,
      );

      // TODO revered order
    },
  );

  await t.should(
    "generate datamodel with one to many self",
    async () => {
      await assertGeneratedSchema(
        "one-to-many-self",
        outdent`
          model TreeNode {
              id Int @id @default(autoincrement())
              parent TreeNode @relation(name: "__rel_TreeNode_TreeNode_2", fields: [parentId], references: [id])
              parentId Int
              children TreeNode[] @relation(name: "__rel_TreeNode_TreeNode_2")
          }
        `,
      );

      await assertGeneratedSchema(
        "explicit-one-to-many-self",
        outdent`
          model TreeNode {
              id Int @id @default(autoincrement())
              parent TreeNode @relation(name: "__rel_TreeNode_TreeNode_2", fields: [parentId], references: [id])
              parentId Int
              children TreeNode[] @relation(name: "__rel_TreeNode_TreeNode_2")
          }
        `,
      );

      await assertGeneratedSchema(
        "one-to-many-self-2",
        outdent`
          model TreeNode {
              id Int @id @default(autoincrement())
              children TreeNode[] @relation(name: "__rel_TreeNode_TreeNode_2")
              parent TreeNode @relation(name: "__rel_TreeNode_TreeNode_2", fields: [parentId], references: [id])
              parentId Int
          }
        `,
      );

      await assertGeneratedSchema(
        "explicit-one-to-many-self-2",
        outdent`
          model TreeNode {
              id Int @id @default(autoincrement())
              children TreeNode[] @relation(name: "__rel_TreeNode_TreeNode_2")
              parent TreeNode @relation(name: "__rel_TreeNode_TreeNode_2", fields: [parentId], references: [id])
              parentId Int
          }
        `,
      );
    },
  );

  await t.should("generate datamodel with one to one self", async () => {
    await assertGeneratedSchema(
      "one-to-one-self",
      outdent`
        model ListNode {
            id String @db.Uuid @id @default(uuid())
            next ListNode? @relation(name: "__rel_ListNode_ListNode_2", fields: [nextId], references: [id])
            nextId String? @db.Uuid
            prev ListNode? @relation(name: "__rel_ListNode_ListNode_2")

            @@unique(nextId)
        }
      `,
    );

    await assertGeneratedSchema(
      "one-to-one-self-2",
      outdent`
        model ListNode {
            id String @db.Uuid @id @default(uuid())
            prev ListNode? @relation(name: "__rel_ListNode_ListNode_2")
            next ListNode? @relation(name: "__rel_ListNode_ListNode_2", fields: [nextId], references: [id])
            nextId String? @db.Uuid

            @@unique(nextId)
        }
      `,
    );
  });

  await t.should(
    "generate typegraph with multiple relationships",
    async () => {
      await assertGeneratedSchema(
        "multiple-relationships",
        outdent`
          model User {
              id String @db.Uuid @id @default(uuid())
              email String @unique
              posts Post[] @relation(name: "__rel_Post_User_1")
              favorite_post Post? @relation(name: "__rel_User_Post_2", fields: [favorite_postId], references: [id])
              favorite_postId String? @db.Uuid
          }

          model Post {
              id String @db.Uuid @id @default(uuid())
              title String
              content String
              author User @relation(name: "__rel_Post_User_1", fields: [authorId], references: [id])
              authorId String @db.Uuid
              favorite_of User[] @relation(name: "__rel_User_Post_2")
          }
        `,
      );

      await assertGeneratedSchema(
        "multiple-relationships-2",
        outdent`
          model User {
              id String @db.Uuid @id @default(uuid())
              email String @unique
              posts Post[] @relation(name: "__rel_Post_User_1")
              published_posts Post[] @relation(name: "PostPublisher")
              favorite_post Post? @relation(name: "__rel_User_Post_3", fields: [favorite_postId], references: [id])
              favorite_postId String? @db.Uuid
          }

          model Post {
              id String @db.Uuid @id @default(uuid())
              title String
              content String
              author User @relation(name: "__rel_Post_User_1", fields: [authorId], references: [id])
              authorId String @db.Uuid
              publisher User? @relation(name: "PostPublisher", fields: [publisherId], references: [id])
              publisherId String? @db.Uuid
              favorite_of User[] @relation(name: "__rel_User_Post_3")
          }
        `,
      );

      await assertGeneratedSchema(
        "multiple-self-relationships",
        outdent`
          model Person {
              id String @db.Uuid @id @default(uuid())
              personal_hero Person? @relation(name: "__rel_Person_Person_2", fields: [personal_heroId], references: [id])
              personal_heroId String? @db.Uuid
              hero_of Person? @relation(name: "__rel_Person_Person_2")
              mother Person? @relation(name: "__rel_Person_Person_4", fields: [motherId], references: [id])
              motherId String? @db.Uuid
              children Person[] @relation(name: "__rel_Person_Person_4")

              @@unique(personal_heroId)
          }
        `,
      );
    },
  );

  // TODO test missing target
});
