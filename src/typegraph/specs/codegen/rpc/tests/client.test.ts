// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { assertEquals } from "jsr:@std/assert";
import * as path from "jsr:@std/path";
import { readOutput, writeToInput } from "./utils.ts";

const dirname = new URL(".", import.meta.url).pathname;

const transactions = [
  {
    request: {
      jsonrpc: "2.0",
      method: "hello",
      params: { name: "world" },
      id: 0,
    },
    response: { jsonrpc: "2.0", result: "ok", id: 0 },
  },
  {
    request: {
      jsonrpc: "2.0",
      method: "foo",
      id: 1,
    },
    response: { jsonrpc: "2.0", result: "bar", id: 1 },
  },
];

async function testClient(params: { command: string; args: string[] }) {
  const command = new Deno.Command(params.command, {
    args: params.args,
    stdin: "piped",
    stdout: "piped",
  });
  const client = command.spawn();
  const reader = client.stdout.getReader();
  const writer = client.stdin.getWriter();

  for (const transaction of transactions) {
    const request = await readOutput(reader); // "jsonrpc: { ... }\n"
    const sliceIndex = request.search(":");
    const json = request.slice(sliceIndex + 1);

    assertEquals(JSON.parse(json), transaction.request);

    await writeToInput(writer, JSON.stringify(transaction.response) + "\n");
  }

  const finalOutput = await readOutput(reader);
  const expected = { first: "ok", second: "bar" };

  assertEquals(JSON.parse(finalOutput), expected);

  client.kill();

  await reader.cancel();
  await writer.close();
  await client.status;
}

Deno.test("Test TypeScript client", async () => {
  const params = {
    command: "deno",
    args: ["run", "-A", path.join(dirname, "../typescript/client_mock.ts")],
  };

  await testClient(params);
});

Deno.test("Test Python client", async () => {
  const params = {
    command: "python3",
    args: [path.join(dirname, "../python/client_mock.py")],
  };

  await testClient(params);
});
