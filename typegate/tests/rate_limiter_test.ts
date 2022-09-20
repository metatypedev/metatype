// Copyright Metatype under the Elastic License 2.0.

import {
  decrPosCmd,
  RateLimit,
  RedisRateLimiter,
} from "../src/rate_limiter.ts";
import { redisConfig } from "../src/config.ts";
import { assertEquals, assertThrows } from "std/testing/asserts.ts";
import { connect, Raw } from "redis";

const assertRateLimited = (l: RateLimit, n: number) =>
  assertThrows(
    () => {
      l.consume(n);
    },
    Error,
    "rate-limited",
  );

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.test("Rate limiter", async (t) => {
  const t1 = "test_key_1";
  const t2 = "test_key_2";

  await t.step("should have custom redis decrPos command", async () => {
    const r = await connect(redisConfig);
    await r.del(t1);

    const assertEqualsFirst = async (
      valueP: Promise<Raw>,
      expected: unknown,
    ) => {
      const value = await valueP;
      assertEquals((value as unknown[])[0], expected);
    };

    assertEqualsFirst(r.eval(decrPosCmd, [t1, t2], [1]), -1);

    assertEquals(await r.set(t1, -1), "OK");
    assertEqualsFirst(r.eval(decrPosCmd, [t1, t2], [1]), 0);

    assertEquals(await r.set(t1, 4), "OK");
    assertEqualsFirst(r.eval(decrPosCmd, [t1, t2], [3]), 1);

    assertEquals(await r.get(t1), "1");
    assertEqualsFirst(r.eval(decrPosCmd, [t1, t2], [2]), 0);

    assertEquals(await r.get(t1), "0");

    assertEquals(await r.del(t1), 1);

    r.close();
  });

  await t.step("should enforce simple budget limitation", async () => {
    const rl = await RedisRateLimiter.init(redisConfig);
    await rl.reset(t1);

    const l1 = await rl.limit(t1, 2, 60, 5, 0);
    assertEquals(l1.budget, 1);
    assertEquals(l1.consumed, 1);

    l1.consume(1);
    assertEquals(l1.budget, 0);
    assertEquals(l1.consumed, 2);

    assertRateLimited(l1, 1);

    await rl.terminate();
  });

  await t.step("should enforce global budget", async () => {
    const rl = await RedisRateLimiter.init(redisConfig);
    await rl.reset(t1);

    const l1 = await rl.limit(t1, 10, 60, 5, 0);
    assertEquals(l1.budget, 4);
    assertEquals(l1.consumed, 1);

    l1.consume(4);
    assertEquals(l1.budget, 0);
    assertEquals(l1.consumed, 5);

    assertRateLimited(l1, 1);

    await rl.terminate();
  });

  await t.step("should reject single over consume", async () => {
    const rl = await RedisRateLimiter.init(redisConfig);
    await rl.reset(t1);

    const l1 = await rl.limit(t1, 3, 60, 5, 0);
    assertEquals(l1.budget, 2);
    assertEquals(l1.consumed, 1);

    assertRateLimited(l1, 3);

    await rl.terminate();
  });

  await t.step("should handle concurrent budget", async () => {
    const rl = await RedisRateLimiter.init(redisConfig);
    await rl.reset(t1);

    const l1 = await rl.limit(t1, 5, 60, 5, 0);
    assertEquals(l1.budget, 4);
    assertEquals(l1.consumed, 1);

    assertEquals(rl.getLocal(t1), 4);
    assertEquals(await rl.getGlobal(t1), 4);

    const l2 = await rl.limit(t1, 3, 60, 5, 0);
    assertEquals(l1.budget, 4);
    assertEquals(l1.consumed, 1);
    assertEquals(l2.budget, 2);
    assertEquals(l2.consumed, 1);

    assertEquals(rl.getLocal(t1), 3);
    assertEquals(await rl.getGlobal(t1), 3);

    l1.consume(1);
    await rl.awaitBackground();
    assertEquals(l1.budget, 2);
    assertEquals(l1.consumed, 2);
    assertEquals(l2.budget, 2);
    assertEquals(l2.consumed, 1);

    assertEquals(rl.getLocal(t1), 2);
    assertEquals(await rl.getGlobal(t1), 2);

    l2.consume(2);
    await rl.awaitBackground();
    assertEquals(l1.budget, 2);
    assertEquals(l1.consumed, 2);
    assertEquals(l2.budget, 0);
    assertEquals(l2.consumed, 3);

    assertEquals(rl.getLocal(t1), 0);
    assertEquals(await rl.getGlobal(t1), 0);

    assertRateLimited(l1, 1);
    assertRateLimited(l2, 1);

    await rl.terminate();
  });

  await t.step(
    "should handle concurrent budget with third-limiter midway",
    async () => {
      const rl = await RedisRateLimiter.init(redisConfig);
      await rl.reset(t1);

      const l1 = await rl.limit(t1, 5, 60, 5, 0);
      assertEquals(l1.budget, 4);
      assertEquals(l1.consumed, 1);

      assertEquals(rl.getLocal(t1), 4);
      assertEquals(await rl.getGlobal(t1), 4);

      const l2 = await rl.limit(t1, 3, 60, 5, 0);
      assertEquals(l1.budget, 4);
      assertEquals(l1.consumed, 1);
      assertEquals(l2.budget, 2);
      assertEquals(l2.consumed, 1);

      assertEquals(rl.getLocal(t1), 3);
      assertEquals(await rl.getGlobal(t1), 3);

      l1.consume(1);
      await rl.awaitBackground();
      assertEquals(l1.budget, 2);
      assertEquals(l1.consumed, 2);
      assertEquals(l2.budget, 2);
      assertEquals(l2.consumed, 1);

      assertEquals(rl.getLocal(t1), 2);
      assertEquals(await rl.getGlobal(t1), 2);

      const l3 = await rl.limit(t1, 3, 60, 5, 0);
      assertEquals(l1.budget, 2);
      assertEquals(l1.consumed, 2);
      assertEquals(l2.budget, 2);
      assertEquals(l2.consumed, 1);
      assertEquals(l3.budget, 1);
      assertEquals(l3.consumed, 1);

      assertEquals(rl.getLocal(t1), 1);
      assertEquals(await rl.getGlobal(t1), 1);

      l3.consume(1);
      await rl.awaitBackground();
      assertEquals(l1.budget, 2);
      assertEquals(l1.consumed, 2);
      assertEquals(l2.budget, 2);
      assertEquals(l2.consumed, 1);
      assertEquals(l3.budget, 0);
      assertEquals(l3.consumed, 2);

      assertEquals(rl.getLocal(t1), 0);
      assertEquals(await rl.getGlobal(t1), 0);

      assertRateLimited(l1, 1);
      assertRateLimited(l2, 1);
      assertRateLimited(l3, 1);

      await rl.terminate();
    },
  );

  await t.step(
    "should handle concurrent limiter",
    async () => {
      const rl1 = await RedisRateLimiter.init(redisConfig);
      const rl2 = await RedisRateLimiter.init(redisConfig);
      await rl1.reset(t1);

      const l1 = await rl1.limit(t1, 5, 60, 5, 0);
      assertEquals(l1.budget, 4);
      assertEquals(l1.consumed, 1);

      assertEquals(await rl1.getGlobal(t1), 4);
      assertEquals(rl1.getLocal(t1), 4);
      assertEquals(rl2.getLocal(t1), null);

      const l2 = await rl2.limit(t1, 5, 60, 5, 0);
      assertEquals(l1.budget, 4);
      assertEquals(l1.consumed, 1);
      assertEquals(l2.budget, 3);
      assertEquals(l2.consumed, 1);

      assertEquals(await rl1.getGlobal(t1), 3);
      assertEquals(rl1.getLocal(t1), 4);
      assertEquals(rl2.getLocal(t1), 3);

      l1.consume(1);
      await rl1.awaitBackground();
      // l1 may rely on wrong local limit, but only once
      assertEquals(l1.budget, 3);
      assertEquals(l1.consumed, 2);
      assertEquals(l2.budget, 3);
      assertEquals(l2.consumed, 1);

      assertEquals(await rl1.getGlobal(t1), 2);
      assertEquals(rl1.getLocal(t1), 2);
      assertEquals(rl2.getLocal(t1), 3);

      l1.consume(1);
      await rl1.awaitBackground();
      assertEquals(l1.budget, 1);
      assertEquals(l1.consumed, 3);
      assertEquals(l2.budget, 3);
      assertEquals(l2.consumed, 1);

      assertEquals(await rl1.getGlobal(t1), 1);
      assertEquals(rl1.getLocal(t1), 1);
      assertEquals(rl2.getLocal(t1), 3);

      l2.consume(2);
      await rl2.awaitBackground();
      // same for l2
      assertEquals(l1.budget, 1);
      assertEquals(l1.consumed, 3);
      assertEquals(l2.budget, 1);
      assertEquals(l2.consumed, 3);

      assertEquals(await rl1.getGlobal(t1), 0);
      assertEquals(rl1.getLocal(t1), 1);
      assertEquals(rl2.getLocal(t1), 0);

      l1.consume(1);
      await rl1.awaitBackground();
      assertRateLimited(l1, 1);
      assertRateLimited(l2, 1);

      await rl1.terminate();
      await rl2.terminate();
    },
  );

  await t.step(
    "should have only one adding budget",
    async () => {
      const rl1 = await RedisRateLimiter.init(redisConfig);
      const rl2 = await RedisRateLimiter.init(redisConfig);
      await rl1.reset(t1);

      const l1 = await rl1.limit(t1, 16, 6, 30, 0);
      assertEquals(l1.budget, 15);
      assertEquals(l1.consumed, 1);

      assertEquals(await rl1.getGlobal(t1), 29);
      assertEquals(rl1.getLocal(t1), 29);
      assertEquals(rl2.getLocal(t1), null);

      l1.consume(15);
      await rl1.awaitBackground();
      assertEquals(l1.budget, 0);
      assertEquals(l1.consumed, 16);

      assertEquals(await rl1.getGlobal(t1), 14);
      assertEquals(rl1.getLocal(t1), 14);
      assertEquals(rl2.getLocal(t1), null);

      assertRateLimited(l1, 1);
      await rl1.awaitBackground();

      const l2 = await rl1.limit(t1, 16, 6, 30, 0);
      assertEquals(l2.budget, 12);
      assertEquals(l2.consumed, 1);

      assertEquals(await rl1.getGlobal(t1), 12);
      assertEquals(rl1.getLocal(t1), 12);
      assertEquals(rl2.getLocal(t1), null);

      l2.consume(12);
      await rl1.awaitBackground();
      assertEquals(l2.budget, 0);
      assertEquals(l2.consumed, 13);

      assertEquals(await rl1.getGlobal(t1), 0);
      assertEquals(rl1.getLocal(t1), 0);
      assertEquals(rl2.getLocal(t1), null);

      assertRateLimited(l2, 1);

      // add 30 / 6 = 5
      await sleep(1000);

      const l3P = rl1.limit(t1, 16, 6, 30, 0);
      const l4P = rl1.limit(t1, 16, 6, 30, 0);
      const l5P = rl2.limit(t1, 16, 6, 30, 0);

      const [l3, l4, l5] = await Promise.all([l3P, l4P, l5P]);
      await rl1.awaitBackground();
      await rl2.awaitBackground();

      assertEquals(await rl1.getGlobal(t1), 3);
      //assertEquals(rl1.getLocal(t1), 3);
      //assertEquals(rl2.getLocal(t1), 4);

      l5.consume(1);
      await rl2.awaitBackground();

      assertEquals(await rl1.getGlobal(t1), 2);
      assertEquals(rl1.getLocal(t1), 3);
      assertEquals(rl2.getLocal(t1), 2);

      l3.consume(1);
      await rl1.awaitBackground();
      assertEquals(l3.budget, 2);
      assertEquals(l3.consumed, 2);
      assertEquals(l4.budget, 3);
      assertEquals(l4.consumed, 1);

      assertEquals(await rl1.getGlobal(t1), 1);
      assertEquals(rl1.getLocal(t1), 1);
      assertEquals(rl2.getLocal(t1), 2);

      l4.consume(1);
      await rl1.awaitBackground();
      assertEquals(l3.budget, 2);
      assertEquals(l3.consumed, 2);
      assertEquals(l4.budget, 0);
      assertEquals(l4.consumed, 2);

      assertEquals(await rl1.getGlobal(t1), 0);
      assertEquals(rl1.getLocal(t1), 0);
      assertEquals(rl2.getLocal(t1), 2);

      assertRateLimited(l3, 1);
      assertRateLimited(l4, 1);

      l5.consume(1);
      // overconsume
      await rl2.awaitBackground();
      assertEquals(l5.budget, 1);

      assertEquals(await rl1.getGlobal(t1), 0);
      assertEquals(rl1.getLocal(t1), 0);
      assertEquals(rl2.getLocal(t1), 0);

      assertRateLimited(l5, 1);

      await rl1.terminate();
      await rl2.terminate();
    },
  );
});
