from pathlib import Path

from typegraph import TypeGraph, policies, t
from typegraph.runtimes.grpc import GrpcRuntime

this_dir = Path(__file__).parent

with TypeGraph("Grpc") as g:
    # gRPC server endpoint
    grpc = GrpcRuntime("localhost:4770")
    public = policies.public()

    g.expose(
        greet=grpc.call_method(
            # protocol buffer file with the definition for the method to call
            this_dir.joinpath("grpc_server/proto/helloworld.proto"),
            # the method to call: `SayHello`
            "/helloworld.Greeter/SayHello",
            t.struct({"name": t.string()}),
            t.string(),
        ),
        default_policy=[public],
    )
