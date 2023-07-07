from pathlib import Path

from typegraph import TypeGraph, policies, t
from typegraph.runtimes.grpc import GrpcRuntime

this_dir = Path(__file__).parent

with TypeGraph("Grpc") as g:
    # gRPC server endpoint
    grpc = GrpcRuntime("http://localhost:4770")
    public = policies.public()

    g.expose(
        greet=grpc.call_method(
            # protocol buffer file with the definition for the method to call
            this_dir.joinpath("grpc_server/proto/helloworld.proto"),
            # the method to call: `SayHello`
            "/helloworld.Greeter/SayHello",
            t.struct(
                {
                    "name": t.string(),
                }
            ),
            t.struct({"message": t.string()}),
        ),
        sum=grpc.call_method(
            this_dir.joinpath("grpc_server/proto/maths.proto"),
            "/maths.Calculator/Sum",
            t.struct(
                {
                    "list": t.array(t.integer()),
                }
            ),
            t.struct({"total": t.integer()}),
        ),
        country=grpc.call_method(
            this_dir.joinpath("grpc_server/proto/geography.proto"),
            "/geography.Demography/Country",
            t.struct({"name": t.string()}),
            t.struct(
                {
                    "name": t.string(),
                    "capital": t.string(),
                    "population": t.integer(),
                    "currencies": t.array(
                        t.struct(
                            {
                                "code": t.string(),
                                "name": t.string(),
                                "symbol": t.string(),
                            }
                        )
                    ),
                }
            ),
        ),
        is_prime=grpc.call_method(
            this_dir.joinpath("grpc_server/proto/maths.proto"),
            "/maths.Calculator/IsPrime",
            t.struct({"number": t.integer()}),
            t.struct(
                {
                    "isPrime": t.boolean(),
                }
            ),
        ),
        default_policy=[public],
    )
