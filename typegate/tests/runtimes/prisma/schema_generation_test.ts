// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "../../utils/mod.ts";
import { serialize } from "../../utils/meta.ts";
import { SchemaGenerator } from "../../../src/runtimes/prisma/hooks/generate_schema.ts";
import * as PrismaRT from "../../../src/runtimes/prisma/types.ts";
import { assertEquals } from "std/assert/mod.ts";
import outdent from "outdent";
import { SecretManager, TypeGraph } from "../../../src/typegraph/mod.ts";

interface Permutation<T> {
  (arr: T[]): T[];
}

async function assertGeneratedSchema(
  tgName: string,
  schema: string,
  reorderModels?: Permutation<number>,
) {
  const tg = await TypeGraph.parseJson(
    await serialize("runtimes/prisma/schema_generation.py", {
      unique: true,
      typegraph: tgName,
    }),
  );

  const runtime = tg.runtimes.filter((rt) =>
    rt.name === "prisma"
  )[0] as PrismaRT.DS<PrismaRT.DataRaw>;

  const secretKey = `TG_${
    tgName.toUpperCase().replaceAll(/[^\w]/g, "_")
  }_POSTGRES`;

  if (reorderModels) {
    runtime.data.models = reorderModels(runtime.data.models);
  }

  const schemaGenerator = new SchemaGenerator(
    tg,
    runtime.data,
    new SecretManager(tg, {
      [secretKey]: "postgresql://postgres:postgres@localhost:5432/postgres",
    }),
  );

  assertEquals(
    schemaGenerator.generate(),
    schema,
  );
}

Meta.test("schema generation", async (t) => {
  await t.should("generate datamodel for simple model", async () => {
    await assertGeneratedSchema(
      "simple-model",
      outdent`
        model User {
            id Int @id @default(autoincrement())
            name String @db.Text
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

      await assertGeneratedSchema(
        "implicit-one-to-many",
        outdent`
          model Post {
              id Int @id @default(autoincrement())
              author User @relation(name: "__rel_Post_User_1", fields: [authorId], references: [id])
              authorId Int
          }

          model User {
              id Int @id @default(autoincrement())
              posts Post[] @relation(name: "__rel_Post_User_1")
          }
        `,
        ([a, b]) => [b, a],
      );
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

      await assertGeneratedSchema(
        "optional-one-to-many",
        outdent`
          model Post {
              id Int @id @default(autoincrement())
              author User? @relation(name: "__rel_Post_User_1", fields: [authorId], references: [id])
              authorId Int?
          }
  
          model User {
              id Int @id @default(autoincrement())
              posts Post[] @relation(name: "__rel_Post_User_1")
          }
        `,
        ([a, b]) => [b, a],
      );
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

      await assertGeneratedSchema(
        "implicit-one-to-one",
        outdent`
          model Profile {
              id String @db.Uuid @id @default(uuid())
              user User @relation(name: "__rel_Profile_User_1", fields: [userId], references: [id])
              userId Int
      
              @@unique(userId)
          }
      
          model User {
              id Int @id @default(autoincrement())
              profile Profile? @relation(name: "__rel_Profile_User_1")
          }
        `,
        ([a, b]) => [b, a],
      );
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

      await assertGeneratedSchema(
        "optional-one-to-one",
        outdent`
          model Profile {
              id String @db.Uuid @id @default(uuid())
              user User? @relation(name: "__rel_Profile_User_1", fields: [userId], references: [id])
              userId Int?
  
              @@unique(userId)
          }

          model User {
              id Int @id @default(autoincrement())
              profile Profile? @relation(name: "__rel_Profile_User_1")
          }
        `,
        ([a, b]) => [b, a],
      );
    },
  );

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

      await assertGeneratedSchema(
        "semi-implicit-one-to-one-2",
        outdent`
          model Profile {
              id String @db.Uuid @id @default(uuid())
              user User @relation(name: "userProfile", fields: [userId], references: [id])
              userId Int
  
              @@unique(userId)
          }

          model User {
              id Int @id
              profile Profile? @relation(name: "userProfile")
          }
        `,
        ([a, b]) => [b, a],
      );
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
              children TreeNode[] @relation(name: "__rel_TreeNode_TreeNode_1")
              parent TreeNode @relation(name: "__rel_TreeNode_TreeNode_1", fields: [parentId], references: [id])
              parentId Int
          }
        `,
      );

      await assertGeneratedSchema(
        "explicit-one-to-many-self",
        outdent`
          model TreeNode {
              id Int @id @default(autoincrement())
              children TreeNode[] @relation(name: "__rel_TreeNode_TreeNode_1")
              parent TreeNode @relation(name: "__rel_TreeNode_TreeNode_1", fields: [parentId], references: [id])
              parentId Int
          }
        `,
      );

      await assertGeneratedSchema(
        "one-to-many-self-2",
        outdent`
          model TreeNode {
              id Int @id @default(autoincrement())
              parent TreeNode @relation(name: "__rel_TreeNode_TreeNode_1", fields: [parentId], references: [id])
              parentId Int
              children TreeNode[] @relation(name: "__rel_TreeNode_TreeNode_1")
          }
        `,
      );

      await assertGeneratedSchema(
        "explicit-one-to-many-self-2",
        outdent`
          model TreeNode {
              id Int @id @default(autoincrement())
              parent TreeNode @relation(name: "__rel_TreeNode_TreeNode_1", fields: [parentId], references: [id])
              parentId Int
              children TreeNode[] @relation(name: "__rel_TreeNode_TreeNode_1")
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
            next ListNode? @relation(name: "__rel_ListNode_ListNode_1", fields: [nextId], references: [id])
            nextId String? @db.Uuid
            prev ListNode? @relation(name: "__rel_ListNode_ListNode_1")
  
            @@unique(nextId)
        }
      `,
    );

    await assertGeneratedSchema(
      "one-to-one-self-2",
      outdent`
        model ListNode {
            id String @db.Uuid @id @default(uuid())
            prev ListNode? @relation(name: "__rel_ListNode_ListNode_1")
            next ListNode? @relation(name: "__rel_ListNode_ListNode_1", fields: [nextId], references: [id])
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
              email String @db.Text @unique
              posts Post[] @relation(name: "__rel_Post_User_1")
              favorite_post Post? @relation(name: "__rel_User_Post_2", fields: [favorite_postId], references: [id])
              favorite_postId String? @db.Uuid
          }

          model Post {
              id String @db.Uuid @id @default(uuid())
              title String @db.VarChar(256)
              content String @db.Text
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
              email String @db.Text @unique
              posts Post[] @relation(name: "__rel_Post_User_1")
              published_posts Post[] @relation(name: "PostPublisher")
              favorite_post Post? @relation(name: "__rel_User_Post_3", fields: [favorite_postId], references: [id])
              favorite_postId String? @db.Uuid
          }

          model Post {
              id String @db.Uuid @id @default(uuid())
              title String @db.VarChar(256)
              content String @db.Text
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
              personal_hero Person? @relation(name: "__rel_Person_Person_1", fields: [personal_heroId], references: [id])
              personal_heroId String? @db.Uuid
              hero_of Person? @relation(name: "__rel_Person_Person_1")
              mother Person? @relation(name: "__rel_Person_Person_2", fields: [motherId], references: [id])
              motherId String? @db.Uuid
              children Person[] @relation(name: "__rel_Person_Person_2")
      
              @@unique(personal_heroId)
          }
        `,
      );
    },
  );
});
