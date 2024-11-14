# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph.graph.typegraph import Graph
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime

from typegraph import t, typegraph


@typegraph()
def either_node(g: Graph):
    deno = DenoRuntime()

    # user models

    kid = t.struct(
        {
            "age": t.integer(min=5, max=16),
            "name": t.string(),
            "school": t.string(),
        },
        name="Kid",
    )

    teen = t.struct(
        {
            "age": t.integer(min=17, max=24),
            "name": t.string(),
            "college": t.string(),
        },
        name="Teen",
    )

    adult = t.struct(
        {
            "age": t.integer(min=25),
            "name": t.string(),
            "company": t.string(),
        },
        name="Adult",
    )

    user = t.either([kid, teen, adult], name="User")

    # transaction models

    success_transaction = t.struct(
        {
            "user_id": t.string(),
            "date": t.date(),
        },
        name="SuccessTransaction",
    )
    failed_transaction = t.struct({"reason": t.string()}, name="FailedTransaction")

    response = t.either([success_transaction, failed_transaction], name="Response")

    public = Policy.public()

    regist_user = deno.import_(
        t.struct({"user": user}),
        response,
        module="ts/either/user_register.ts",
        name="regist_user",
    ).with_policy(public)

    g.expose(regist_user=regist_user)
