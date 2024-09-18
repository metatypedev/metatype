// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, typegraph } from "@typegraph/sdk/index.ts";
import { GrpcRuntime } from "@typegraph/sdk/runtimes/grpc.ts";

export const tg = await typegraph("helloworld", (g) => {
  const endpoint = "tcp://localhost:4770";
  const proto_file = "proto/helloworld.proto";

  const grpc_runtime = new GrpcRuntime(proto_file, endpoint);

  g.expose(
    {
      greet: grpc_runtime.call("/helloworld.Greeter/SayHello"),
    },
    Policy.public(),
  );
});
