// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, typegraph } from "@typegraph/sdk/index.ts";
import { GrpcRuntime } from "@typegraph/sdk/runtimes/grpc.ts";

const __dirname = new URL(".", import.meta.url).pathname;

export const tg = await typegraph("helloworld", (g) => {
  const endpoint = "tcp://localhost:4770";
  const helloworld = `${__dirname}proto/helloworld.proto`;

  const helloworld_grpc = new GrpcRuntime(
    helloworld,
    endpoint,
  );

  g.expose({
    greet: helloworld_grpc.call_grpc_method("/helloworld.Greeter/SayHello"),
  }, Policy.public());
});
