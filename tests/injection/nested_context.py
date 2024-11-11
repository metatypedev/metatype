# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes import DenoRuntime


@typegraph()
def nested_context(g: Graph):
    deno = DenoRuntime()
    has_profile = Policy.context("profile")

    g.expose(
        has_profile,
        injectedId=deno.identity(
            # TODO validate the path against the profiler result??
            t.struct({"id": t.integer().from_context("profile.id")}),
        ),
        secondProfileData=deno.identity(
            t.struct({"second": t.integer().from_context("profile.data[1]")}),
        ),
        customKey=deno.identity(
            t.struct({"custom": t.integer().from_context('profile["custom key"]')}),
        ),
        optional=deno.identity(
            t.struct({"optional": t.email().optional().from_context("profile.email")}),
        ),
    )
