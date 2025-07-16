// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { assert, assertEquals } from "@std/assert";
import { BlockingInterval } from "@metatype/typegate/runtimes/substantial/workflow_worker_manager.ts";
import { Meta } from "../../utils/mod.ts";
import { sleep } from "@metatype/typegate/utils.ts";

Meta.test("custom blocking setInterval", async (t) => {
  await t.should("not have race condition", async () => {
    const interval = new BlockingInterval();
    const deltas = [] as Array<number>;
    let counter = 1, iterations = 0;
    const maxIterations = 3;
    const periodMs = 300;
    const forceBlockMs = periodMs * 1.5;
    let start = Date.now();

    await new Promise((resolve) => {
      interval.start(periodMs, async () => {
        console.log(counter);
        iterations++;
        await sleep(forceBlockMs);

        const end = Date.now();
        deltas.push(end - start);
        start = end;

        if (counter >= maxIterations) {
          // await interval.kill();// deadlock (awaits on this handler to finish)
          resolve(true);
          return;
        }

        counter += 1;
      });
    });

    await interval.kill();

    await sleep(2 * forceBlockMs);
    assertEquals(
      iterations,
      maxIterations,
      "interval should have been killed properly",
    );

    for (let i = 0; i < deltas.length; i += 1) {
      const delta = deltas[i];
      assert(
        delta > periodMs,
        `#${
          i + 1
        }: ${delta} >? ${periodMs}: iteration should have taken the inner function time but not the tick time`,
      );
      assert(
        delta > 0.9 * forceBlockMs,
        `#${
          i + 1
        }: ${delta} ~? ${forceBlockMs}: iteration should have taken the inner function time approximately`,
      );
    }
  });
});
