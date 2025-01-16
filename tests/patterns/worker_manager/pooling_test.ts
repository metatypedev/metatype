// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { createSimpleWaitQueue } from "@metatype/typegate/runtimes/patterns/worker_manager/pooling.ts";
import { assert, assertEquals, assertFalse } from "@std/assert";

Deno.test("simple wait queue", (t) => {
  const queue = createSimpleWaitQueue<number>();

  const history: number[] = [];

  assertFalse(queue.shift(() => 1));
  queue.push((v) => history.push(v), () => {});
  assertEquals(history.length, 0);
  queue.shift(() => 2);
  assertEquals(history.length, 1);
  assertEquals(history[0], 2);
  assertFalse(queue.shift(() => 1));
  queue.push((v) => history.push(v), () => {});
  assertEquals(history.length, 1);
  queue.shift(() => 3);
  assertEquals(history.length, 2);
  assertEquals(history[1], 3);
});
