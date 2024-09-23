// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "../../utils/mod.ts";
import { serialize } from "../../utils/meta.ts";
import { SchemaGenerator } from "@metatype/typegate/runtimes/prisma/hooks/generate_schema.ts";
import * as PrismaRT from "@metatype/typegate/runtimes/prisma/types.ts";
import { assertEquals } from "@std/assert";
import outdent from "outdent";
import { SecretManager, TypeGraph } from "@metatype/typegate/typegraph/mod.ts";
import { Model } from "@metatype/typegate/typegraph/types.ts";

interface Permutation<T> {
  (arr: T[]): T[];
}

async function assertGeneratedSchema(
  tgName: string,
  schema: string,
  reorderModels?: Permutation<Model>,
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

  if (reorderModels) {
    runtime.data.models = reorderModels(runtime.data.models);
  }

  const schemaGenerator = new SchemaGenerator(
    tg,
    runtime.data,
    new SecretManager(tg, {
      POSTGRES: "postgresql://postgres:postgres@localhost:5432/postgres",
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
            id Int @default(autoincrement()) @id
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
              id Int @default(autoincrement()) @id
              posts Post[] @relation(name: "rel_Post_User")
          }
  
          model Post {
              id Int @default(autoincrement()) @id
              author User @relation(name: "rel_Post_User", fields: [authorId], references: [id])
              authorId Int
          }
        `,
      );

      await assertGeneratedSchema(
        "implicit-one-to-many",
        outdent`
          model Post {
              id Int @default(autoincrement()) @id
              author User @relation(name: "rel_Post_User", fields: [authorId], references: [id])
              authorId Int
          }
  
          model User {
              id Int @default(autoincrement()) @id
              posts Post[] @relation(name: "rel_Post_User")
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
              id Int @default(autoincrement()) @id
              posts Post[] @relation(name: "rel_Post_User")
          }
  
          model Post {
              id Int @default(autoincrement()) @id
              author User? @relation(name: "rel_Post_User", fields: [authorId], references: [id])
              authorId Int?
          }
        `,
      );

      await assertGeneratedSchema(
        "optional-one-to-many",
        outdent`
          model Post {
              id Int @default(autoincrement()) @id
              author User? @relation(name: "rel_Post_User", fields: [authorId], references: [id])
              authorId Int?
          }
  
          model User {
              id Int @default(autoincrement()) @id
              posts Post[] @relation(name: "rel_Post_User")
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
              id String @db.Uuid @default(uuid()) @id
              user User @relation(name: "userProfile", fields: [userId], references: [id])
              userId Int
  
              @@unique([userId])
          }
        `,
      );

      await assertGeneratedSchema(
        "implicit-one-to-one",
        outdent`
          model User {
              id Int @default(autoincrement()) @id
              profile Profile? @relation(name: "rel_Profile_User")
          }
  
          model Profile {
              id String @db.Uuid @default(uuid()) @id
              user User @relation(name: "rel_Profile_User", fields: [userId], references: [id])
              userId Int
  
              @@unique([userId])
          }
        `,
      );

      await assertGeneratedSchema(
        "implicit-one-to-one",
        outdent`
          model Profile {
              id String @db.Uuid @default(uuid()) @id
              user User @relation(name: "rel_Profile_User", fields: [userId], references: [id])
              userId Int
  
              @@unique([userId])
          }
  
          model User {
              id Int @default(autoincrement()) @id
              profile Profile? @relation(name: "rel_Profile_User")
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
              id Int @default(autoincrement()) @id
              profile Profile? @relation(name: "rel_Profile_User")
          }
  
          model Profile {
              id String @db.Uuid @default(uuid()) @id
              user User? @relation(name: "rel_Profile_User", fields: [userId], references: [id])
              userId Int?
  
              @@unique([userId])
          }
        `,
      );

      await assertGeneratedSchema(
        "optional-one-to-one",
        outdent`
          model Profile {
              id String @db.Uuid @default(uuid()) @id
              user User? @relation(name: "rel_Profile_User", fields: [userId], references: [id])
              userId Int?
  
              @@unique([userId])
          }
  
          model User {
              id Int @default(autoincrement()) @id
              profile Profile? @relation(name: "rel_Profile_User")
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
              id String @db.Uuid @default(uuid()) @id
              user User @relation(name: "userProfile", fields: [userId], references: [id])
              userId Int
  
              @@unique([userId])
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
              id String @db.Uuid @default(uuid()) @id
              user User @relation(name: "userProfile", fields: [userId], references: [id])
              userId Int
  
              @@unique([userId])
          }
        `,
      );

      await assertGeneratedSchema(
        "semi-implicit-one-to-one-2",
        outdent`
          model Profile {
              id String @db.Uuid @default(uuid()) @id
              user User @relation(name: "userProfile", fields: [userId], references: [id])
              userId Int
  
              @@unique([userId])
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
              id Int @default(autoincrement()) @id
              children TreeNode[] @relation(name: "rel_TreeNode_TreeNode")
              parent TreeNode @relation(name: "rel_TreeNode_TreeNode", fields: [parentId], references: [id])
              parentId Int
          }
        `,
      );

      await assertGeneratedSchema(
        "explicit-one-to-many-self",
        outdent`
          model TreeNode {
              id Int @default(autoincrement()) @id
              children TreeNode[] @relation(name: "rel_TreeNode_TreeNode")
              parent TreeNode @relation(name: "rel_TreeNode_TreeNode", fields: [parentId], references: [id])
              parentId Int
          }
        `,
      );

      await assertGeneratedSchema(
        "one-to-many-self-2",
        outdent`
          model TreeNode {
              id Int @default(autoincrement()) @id
              parent TreeNode @relation(name: "rel_TreeNode_TreeNode", fields: [parentId], references: [id])
              parentId Int
              children TreeNode[] @relation(name: "rel_TreeNode_TreeNode")
          }
        `,
      );

      await assertGeneratedSchema(
        "explicit-one-to-many-self-2",
        outdent`
          model TreeNode {
              id Int @default(autoincrement()) @id
              parent TreeNode @relation(name: "rel_TreeNode_TreeNode", fields: [parentId], references: [id])
              parentId Int
              children TreeNode[] @relation(name: "rel_TreeNode_TreeNode")
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
            id String @db.Uuid @default(uuid()) @id
            next ListNode? @relation(name: "rel_ListNode_ListNode", fields: [nextId], references: [id])
            nextId String? @db.Uuid
            prev ListNode? @relation(name: "rel_ListNode_ListNode")
  
            @@unique([nextId])
        }
      `,
    );

    await assertGeneratedSchema(
      "one-to-one-self-2",
      outdent`
        model ListNode {
            id String @db.Uuid @default(uuid()) @id
            prev ListNode? @relation(name: "rel_ListNode_ListNode")
            next ListNode? @relation(name: "rel_ListNode_ListNode", fields: [nextId], references: [id])
            nextId String? @db.Uuid
  
            @@unique([nextId])
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
              id String @db.Uuid @default(uuid()) @id
              email String @db.Text @unique
              posts Post[] @relation(name: "rel_Post_User")
              favorite_post Post? @relation(name: "rel_User_Post", fields: [favorite_postId], references: [id])
              favorite_postId String? @db.Uuid
          }
  
          model Post {
              id String @db.Uuid @default(uuid()) @id
              title String @db.VarChar(256)
              content String @db.Text
              author User @relation(name: "rel_Post_User", fields: [authorId], references: [id])
              authorId String @db.Uuid
              favorite_of User[] @relation(name: "rel_User_Post")
          }
        `,
      );

      await assertGeneratedSchema(
        "multiple-relationships-2",
        outdent`
          model User {
              id String @db.Uuid @default(uuid()) @id
              email String @db.Text @unique
              posts Post[] @relation(name: "rel_Post_User")
              published_posts Post[] @relation(name: "PostPublisher")
              favorite_post Post? @relation(name: "rel_User_Post", fields: [favorite_postId], references: [id])
              favorite_postId String? @db.Uuid
          }
  
          model Post {
              id String @db.Uuid @default(uuid()) @id
              title String @db.VarChar(256)
              content String @db.Text
              author User @relation(name: "rel_Post_User", fields: [authorId], references: [id])
              authorId String @db.Uuid
              publisher User? @relation(name: "PostPublisher", fields: [publisherId], references: [id])
              publisherId String? @db.Uuid
              favorite_of User[] @relation(name: "rel_User_Post")
          }
        `,
      );

      await assertGeneratedSchema(
        "multiple-self-relationships",
        outdent`
          model Person {
              id String @db.Uuid @default(uuid()) @id
              personal_hero Person? @relation(name: "hero", fields: [personal_heroId], references: [id])
              personal_heroId String? @db.Uuid
              hero_of Person? @relation(name: "hero")
              mother Person? @relation(name: "rel_Person_Person", fields: [motherId], references: [id])
              motherId String? @db.Uuid
              children Person[] @relation(name: "rel_Person_Person")
  
              @@unique([personal_heroId])
          }
        `,
      );
    },
  );

  await t.should(
    "typegraph with injections and nested function",
    async () => {
      await assertGeneratedSchema(
        "injection",
        outdent`
          model User {
              id String @db.Uuid @default(uuid()) @id
              email String @db.Text @unique
              date_of_birth DateTime?
              createAt DateTime @default(now())
              updatedAt DateTime @updatedAt
          }
        `,
      );
    },
  );

  await t.should("generate with multi-field id", async () => {
    await assertGeneratedSchema(
      "multi-field-id",
      outdent`
        model Project {
            ownerName String @db.Text
            name String @db.Text
            description String? @db.Text
  
            @@id([ownerName, name])
        }
      `,
    );
  });

  await t.should("generate with foreign id", async () => {
    await assertGeneratedSchema(
      "foreign-id",
      outdent`
        model User {
            id String @db.Uuid @default(uuid()) @id
            email String @db.Text @unique
            profile Profile? @relation(name: "rel_Profile_User")
        }
  
        model Profile {
            user User @relation(name: "rel_Profile_User", fields: [userId], references: [id])
            userId String @db.Uuid @id
            profilePicUrl String @db.Text
            bio String? @db.Text
        }
      `,
    );
  });

  await t.should("generate with multi-field unique constraint", async () => {
    await assertGeneratedSchema(
      "multi-field-unique",
      outdent`
        model Account {
            id String @db.Uuid @default(uuid()) @id
            projects Project[] @relation(name: "rel_Project_Account")
        }
  
        model Project {
            id String @db.Uuid @default(uuid()) @id
            owner Account @relation(name: "rel_Project_Account", fields: [ownerId], references: [id])
            ownerId String @db.Uuid
            name String @db.Text
  
            @@unique([ownerId, name])
        }
      `,
    );
  });
});
