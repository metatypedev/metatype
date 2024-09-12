# Copyright Metatype OÜ, licensed under the Elastic License 2.0.
# SPDX-License-Identifier: Elastic-2.0

from pathlib import Path

from typegraph import Graph, Policy, typegraph
from typegraph.runtimes.grpc import GrpcRuntime


BASE_DIR = Path(__file__).parent


@typegraph()
def helloworld(g: Graph):
    endpoint = "tcp://localhost:4770"

    proto_file = BASE_DIR.joinpath("proto/helloworld.proto")
    grpc_runtime = GrpcRuntime(proto_file, endpoint)

    g.expose(
        Policy.public(),
        greet=grpc_runtime.call("/helloworld.Greeter/SayHello"),
    )
