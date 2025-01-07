# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes import DenoRuntime


@typegraph()
def nested_context(g: Graph):
    deno = DenoRuntime()
    has_profile = Policy.context("profile")

    g.expose(
        has_profile,
        injectedId=deno.func(
            # TODO validate the path against the profiler result??
            t.struct({"id": t.integer().from_context("profile.id")}),
            t.struct({"id": t.integer()}),
            code="x => x",
        ),
        secondProfileData=deno.func(
            t.struct({"second": t.integer().from_context("profile.data[1]")}),
            t.struct({"second": t.integer()}),
            code="x => x",
        ),
        customKey=deno.func(
            t.struct({"custom": t.integer().from_context('profile["custom key"]')}),
            t.struct({"custom": t.integer()}),
            code="x => x",
        ),
        optional=deno.func(
            t.struct({"optional": t.email().optional().from_context("profile.email")}),
            t.struct({"optional": t.email().optional()}),
            code="x => x",
        ),
    )
