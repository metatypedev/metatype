# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes import RandomRuntime, DenoRuntime


@typegraph()
def outjection(g: Graph):
    deno = DenoRuntime()
    random = RandomRuntime(seed=1)

    g.expose(
        Policy.public(),
        randomUser=deno.identity(t.struct()).extend(
            {
                "id": t.uuid().from_random(),
                "age": t.integer().set(19),
                "email": t.email().from_context("user_email"),
                "password": t.string().from_secret(
                    "user_password"
                ),  ## should we allow this?
                "createdAt": t.datetime().inject("now"),
                "firstPost": random.gen(
                    t.struct(
                        {
                            "title": t.string(),
                        }
                    )
                ),  # .extend({"publisherEmail": t.email().from_parent("email")}),
            }
        ),
    )
