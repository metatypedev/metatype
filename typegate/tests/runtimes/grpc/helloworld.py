# Copyright Metatype OÜ, licensed under the Elastic License 2.0.
# SPDX-License-Identifier: Elastic-2.0

from pathlib import Path

from typegraph import Graph, Policy, typegraph
from typegraph.runtimes.grpc import GrpcRuntime


BASE_DIR = Path(__file__).parent


@typegraph()
def helloworld(g: Graph):
    endpoint = "tcp://localhost:4770"

    helloworld = BASE_DIR.joinpath("proto/helloworld.proto")
    helloworld_grpc = GrpcRuntime(helloworld, endpoint)

    g.expose(
        Policy.public(),
        greet=helloworld_grpc.call_grpc_method("/helloworld.Greeter/SayHello"),
    )
