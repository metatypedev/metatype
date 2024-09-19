# skip:start
from typegraph import Graph, Policy, typegraph
from typegraph.graph.params import Cors

# skip:end
# highlight-next-line
from typegraph.runtimes.grpc import GrpcRuntime


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def grpc(g: Graph):
    endpoint = "tcp://localhost:4770"
    proto_file = "proto/helloworld.proto"

    # highlight-next-line
    grpc_runtime = GrpcRuntime(proto_file, endpoint)

    g.expose(
        Policy.public(),
        greet=grpc_runtime.call("/helloworld.Greeter/SayHello"),
    )
