// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import pg from "npm:pg";

export async function dropSchema(schema: string) {
  // remove the database schema
  const client = new pg.Client({
    connectionString: "postgres://postgres:password@localhost:5432/db",
  });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await client.end();
}
