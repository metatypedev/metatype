// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  createSimpleWaitQueue,
  WaitQueueWithTimeout,
} from "@metatype/typegate/runtimes/patterns/worker_manager/pooling.ts";
import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import { delay } from "@std/async/delay";

Deno.test("simple wait queue", (t) => {
  const queue = createSimpleWaitQueue<number>();

  const history: number[] = [];

  assertFalse(queue.shift(() => 1));

  queue.push((v) => history.push(v), () => {});
  assertEquals(history.length, 0);
  assert(queue.shift(() => 2));
  assertEquals(history.length, 1);
  assertEquals(history[0], 2);

  assertFalse(queue.shift(() => 1));

  queue.push((v) => history.push(v), () => {});
  assertEquals(history.length, 1);
  assert(queue.shift(() => 3));
  assertEquals(history.length, 2);
  assertEquals(history[1], 3);
});

Deno.test.only("wait queue with timeout", async (t) => {
  using queue = new WaitQueueWithTimeout<number>(100);

  const history: number[] = [];

  assertFalse(queue.shift(() => 1));

  queue.push((v) => history.push(v), () => {});
  assertEquals(history.length, 0);
  assert(queue.shift(() => 2));
  assertEquals(history.length, 1);
  assertEquals(history[0], 2);

  assertFalse(queue.shift(() => 1));

  queue.push((v) => history.push(v), () => {});
  assertEquals(history.length, 1);
  assert(queue.shift(() => 3));
  assertEquals(history.length, 2);
  assertEquals(history[1], 3);

  {
    const resolvers = Promise.withResolvers();
    queue.push(resolvers.resolve, () => resolvers.reject(new Error("timeout")));
    assertEquals(history.length, 2);
    await assertRejects(
      () =>
        Promise.race([
          delay(100).then(() => false),
          resolvers.promise.then(() => true),
        ]),
      Error,
      "timeout",
    );
    await delay(100);
    // await delay(100);
    // assertEquals(history.length, 2);
    // await assertRejects(() => resolvers.promise, "timeout");
  }
});
