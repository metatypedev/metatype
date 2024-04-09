// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assertExists } from "std/assert/mod.ts";
import { gql, Meta } from "test-utils/mod.ts";
import { MetaTest } from "test-utils/test.ts";
import * as std_path from "std/path/mod.ts";

async function testSerialize(t: MetaTest, file: string) {
  await t.should(`serialize typegraph ${file}`, async () => {
    const { stdout: tg } = await Meta.cli("serialize", "--pretty", "-f", file);
    await t.assertSnapshot(tg);
  });
}

async function waitForHealthy(
  proc: Deno.ChildProcess,
  needle: string,
  io: "stdout" | "stderr" = "stderr",
) {
  let buf = "";
  const decoder = new TextDecoder();
  for await (const chunk of proc[io].values({ preventCancel: true })) {
    const chunkstr = decoder.decode(chunk);
    console.error(chunkstr);
    buf += chunkstr;
    if (buf.includes(needle)) {
      return;
    }
  }
  throw Error("stderr lost before healthy");
}

Meta.test({
  name: "Typegraph using temporal",
}, async (t) => {
  await testSerialize(t, "runtimes/temporal/temporal.py");
  await testSerialize(t, "runtimes/temporal/temporal.ts");
});

Meta.test("temporal integ", async (t) => {
  const greenFlag = [];

  const temporalProc = new Deno.Command("temporal", {
    args: `server start-dev --headless`.split(" "),
    stdout: "piped",
  })
    .spawn();
  t.addCleanup(async () => {
    await temporalProc.stdout.cancel();
    temporalProc.kill();
    await temporalProc.status;
  });

  greenFlag.push(waitForHealthy(
    temporalProc,
    "Frontend is now healthy",
    "stdout",
  ));

  const workerDir = std_path.join(import.meta.dirname!, "worker");
  await t.shell(`pnpm install`.split(" "), {
    currentDir: workerDir,
  });

  const workerProc = new Deno.Command("pnpm", {
    args: `tsx worker.ts`.split(" "),
    stderr: "piped",
    cwd: workerDir,
  })
    .spawn();
  greenFlag.push(waitForHealthy(workerProc, "RUNNING"));

  t.addCleanup(async () => {
    await workerProc.stderr.cancel();
    // Deno.kill(-workerProc.pid);
    workerProc.kill();
    await workerProc.status;
  });

  await Promise.all(greenFlag);

  const e = await t.engine("runtimes/temporal/temporal.ts", {
    secrets: {
      HOST: "http://localhost:7233",
      NAMESPACE: "default",
    },
  });

  const wflowId = "1234";
  const tq = "myTq";

  let runId: string;
  await gql`mutation ($wflowId: String!, $tq: String!) {
      runId: startKv(workflow_id: $wflowId, task_queue: $tq, args: [{ }])
    }`.withVars({ wflowId, tq }).expectBody((body) => {
    assertExists(body.data);
    runId = body.data.runId;
  }).on(e);

  const key = "hello";
  const val = "metatype";

  await gql`mutation ($wflowId: String!, $runId: String!, $key: String!, $val: String!) {
      result: signal(
        workflow_id: $wflowId, 
        run_id: $runId, 
        args: [{ key: $key, value: $val }]
      )
    }`.withVars({
    wflowId,
    runId: runId!,
    key,
    val,
  })
    .expectData({ result: true })
    .on(e);

  await gql`query ($wflowId: String!, $runId: String!, $key: String!) {
      result: query(
        workflow_id: $wflowId, 
        run_id: $runId, 
        args: [$key]
      )
    }`.withVars({
    wflowId,
    runId: runId!,
    key,
  })
    .expectData({ result: val })
    .on(e);
});
