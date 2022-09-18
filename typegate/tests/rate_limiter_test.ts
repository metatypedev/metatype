import { RateLimiter } from "../src/rate_limiter.ts";
import { redisConfig } from "../src/config.ts";

Deno.test("Rate limiter", async (t) => {
  await t.step("should enforce budget limitation", async () => {
    const rl = await RateLimiter.init(redisConfig, 60, 5);
  });
});
