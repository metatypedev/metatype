# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, typegraph
from typegraph.runtimes.grpc import GrpcRuntime


@typegraph()
def maths(g: Graph):
    endpoint = "tcp://localhost:4770"
    proto_file = "proto/maths.proto"

    grpc_runtime = GrpcRuntime(proto_file, endpoint)

    g.expose(
        Policy.public(),
        sum=grpc_runtime.call("/maths.Calculator/Sum"),
        prime=grpc_runtime.call("/maths.Calculator/IsPrime"),
    )
