# Copyright Metatype OÜ, licensed under the Elastic License 2.0.
# SPDX-License-Identifier: Elastic-2.0

from pathlib import Path

from typegraph import Graph, Policy, typegraph
from typegraph.runtimes.grpc import GrpcRuntime


BASE_DIR = Path(__file__).parent


@typegraph()
def maths(g: Graph):
    endpoint = "tcp://localhost:4770"

    proto_file = BASE_DIR.joinpath("proto/maths.proto")
    grpc_runtime = GrpcRuntime(proto_file, endpoint)

    g.expose(
        Policy.public(),
        sum=grpc_runtime.call("/maths.Calculator/Sum"),
        prime=grpc_runtime.call("/maths.Calculator/IsPrime"),
    )
