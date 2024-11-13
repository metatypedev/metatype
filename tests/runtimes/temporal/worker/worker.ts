// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities.js";
import * as url from "node:url";

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDR ?? "localhost:7233",
    // TLS and gRPC metadata configuration goes here.
  });
  // Step 2: Register Workflows and Activities with the Worker.
  const worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: "myTq",
    // Workflows are registered using a path as they run in a separate JS context.
    workflowsPath: url.fileURLToPath(import.meta.resolve("./workflows.js")),
    activities,
    identity: "myWorker",
  });

  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
