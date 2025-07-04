// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { WorkflowClient } from "./common.ts";

/**
 * This stresses the interrupts and the scheduling logic.
 * deno run -A tools/substantial-stress/interrupts.ts
 */

const tgUrl = "http://localhost:7891/substantial";
const sleepWorkflow = new WorkflowClient(tgUrl, "saveAndSleepExample", {
  mutStart: "start_sleep",
  qResults: "results_raw",
});

const initCompleted = await sleepWorkflow.countCompleted();
const initOngoing = await sleepWorkflow.countOngoing();

const amount = 100;
for (let i = 0; i < amount; i += 1) {
  await sleepWorkflow.start({
    a: 1234,
    b: 4567,
  }, false);
}

console.log("Spawned", sleepWorkflow.runs.size);

const statistics = [];
const startTime = new Date();
while (true) {
  const current = {
    time: new Date(),
    ongoing: (await sleepWorkflow.countOngoing()) - initOngoing,
    completed: (await sleepWorkflow.countCompleted()) - initCompleted,
  };
  statistics.push(current);

  console.log(
    "%s --- %d ongoing, %d completed",
    current.time.toJSON(),
    current.ongoing,
    current.completed,
  );

  if (
    current.completed + current.ongoing == amount && current.ongoing == 0 &&
    current.completed == amount
  ) {
    break;
  }

  await new Promise((res) => setTimeout(res, 1000));
}

const durationSecs = (Date.now() - startTime.getTime()) / 1000;
console.log("Successfully ran", amount, sleepWorkflow.workflow);
console.log("Time %fs", durationSecs);

const report = {
  amount,
  durationSecs,
  statistics,
};
await Deno.writeTextFile(
  `${Date.now()}-amount${amount}-${sleepWorkflow.workflow}.json`,
  JSON.stringify(report, null, 2),
);
