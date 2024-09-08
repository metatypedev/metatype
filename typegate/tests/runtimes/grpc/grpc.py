# Copyright Metatype OÜ, licensed under the Elastic License 2.0.
# SPDX-License-Identifier: Elastic-2.0

from pathlib import Path

from typegraph import Graph, Policy, typegraph
from typegraph.runtimes.grpc import GrpcRuntime


BASE_DIR = Path(__file__).parent


@typegraph()
def grpc(g: Graph):
    proto_file = BASE_DIR.joinpath("proto/helloworld.proto")
    grpc = GrpcRuntime(proto_file, "tcp://localhost:4770")

    g.expose(Policy.public(), greet=grpc.call_grpc_method("SayHello"))
