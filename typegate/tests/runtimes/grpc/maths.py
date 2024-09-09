# Copyright Metatype OÜ, licensed under the Elastic License 2.0.
# SPDX-License-Identifier: Elastic-2.0

from pathlib import Path

from typegraph import Graph, Policy, typegraph
from typegraph.runtimes.grpc import GrpcRuntime


BASE_DIR = Path(__file__).parent


@typegraph()
def maths(g: Graph):
    endpoint = "tcp://localhost:4770"

    maths = BASE_DIR.joinpath("proto/maths.proto")
    maths_grpc = GrpcRuntime(maths, endpoint)

    g.expose(
        Policy.public(),
        sum=maths_grpc.call_grpc_method("/maths.Calculator/Sum"),
        isprime=maths_grpc.call_grpc_method("/maths.Calculator/IsPrime"),
    )
