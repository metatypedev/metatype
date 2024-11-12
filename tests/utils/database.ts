// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import pg from "pg";
import { removeMigrations } from "test-utils/migrations.ts";

export async function dropSchema(schema: string) {
  // remove the database schema
  const client = new pg.Client({
    connectionString: "postgresql://postgres:password@localhost:5432/db",
  });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await client.end();
}

export async function reset(tgName: string, schema: string) {
  await removeMigrations(tgName);
  console.log("reset", { tgName, schema });

  await dropSchema(schema);
}

export function randomSchema() {
  return "z" + Math.random().toString(36).substring(2);
}

export function randomPGConnStr() {
  const schema = randomSchema();
  return {
    connStr:
      `postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
    schema,
  };
}
