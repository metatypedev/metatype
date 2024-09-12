// skip:start
import { Policy, typegraph } from "@typegraph/sdk/index.ts";
import { GrpcRuntime } from "@typegraph/sdk/runtimes/grpc.ts";

// skip:end
const __dirname = new URL(".", import.meta.url).pathname;

export const tg = await typegraph(
  {
    name: "grpc",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const endpoint = "tcp://localhost:4770";

    const proto_file = `${__dirname}proto/helloworld.proto`;
    // highlight-next-line
    const grpc_runtime = new GrpcRuntime(proto_file, endpoint);

    g.expose(
      {
        greet: grpc_runtime.call("/helloworld.Greeter/SayHello"),
      },
      Policy.public(),
    );
  },
);
