import { RateLimiter } from "../src/rate_limiter.ts";
import { redisConfig } from "../src/config.ts";
import { assertEquals } from "https://deno.land/std@0.154.0/testing/asserts.ts";

Deno.test("Rate limiter", async (t) => {
  const t1 = "test_key_1";

  await t.step("should enforce budget limitation", async () => {
    const rl = await RateLimiter.init(redisConfig, 60, 5);
    await rl.reset(t1);

    const l1 = await rl.limit(t1, 2);
    assertEquals(l1.budget, 1);
    assertEquals(l1.consumed, 1);

    l1.consume(1);
    assertEquals(l1.budget, 0);
    assertEquals(l1.consumed, 2);

    await rl.terminate();
  });
});
