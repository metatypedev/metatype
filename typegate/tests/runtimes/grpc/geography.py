# Copyright Metatype OÜ, licensed under the Elastic License 2.0.
# SPDX-License-Identifier: Elastic-2.0

from pathlib import Path

from typegraph import Graph, Policy, typegraph
from typegraph.runtimes.grpc import GrpcRuntime


BASE_DIR = Path(__file__).parent


@typegraph()
def geography(g: Graph):
    endpoint = "tcp://localhost:4770"

    geography = BASE_DIR.joinpath("proto/geography.proto")
    geography_grpc = GrpcRuntime(geography, endpoint)

    g.expose(
        Policy.public(),
        dem=geography_grpc.call_grpc_method("/geography.Demography/Country"),
    )
