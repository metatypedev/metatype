# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import os
from typegraph import typegraph, t, Graph
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.substantial import SubstantialRuntime, WorkflowFile
from typegraph.runtimes.substantial import Backend


@typegraph()
def substantial(g: Graph):
    pub = Policy.public()

    backend = Backend.dev_memory()
    if "SUB_BACKEND" in os.environ:
        if os.environ["SUB_BACKEND"] == "fs":
            backend = Backend.dev_fs()
        elif os.environ["SUB_BACKEND"] == "redis":
            backend = Backend.redis("SUB_REDIS")

    file = (
        WorkflowFile.deno(
            file="workflows/workflow.ts", deps=["imports/common_types.ts"]
        )
        .import_(
            [
                "saveAndSleepExample",
                "eventsAndExceptionExample",
                "retryExample",
                "secretsExample",
                "accidentalInputMutation",
                "nonDeterministic",
            ]
        )
        .build()
    )

    sub = SubstantialRuntime(backend, [file])
    deno = DenoRuntime()

    g.expose(
        pub,
        remote_add=deno.func(
            t.struct({"a": t.integer(), "b": t.integer()}),
            t.integer(),
            code="({a, b}) => a + b",
        ),
        remote_static=deno.static(t.integer(), 1234),
        # common
        stop=sub.stop(),
        results=sub.query_results(
            t.either([t.integer(), t.string()]).rename("ResultOrError")
        ),
        results_raw=sub.query_results_raw(),
        workers=sub.query_resources(),
        # sleep
        start_sleep=sub.start(t.struct({"a": t.integer(), "b": t.integer()})).reduce(
            {"name": "saveAndSleepExample"}
        ),
        # email
        start_email=sub.start(t.struct({"to": t.string()})).reduce(
            {"name": "eventsAndExceptionExample"}
        ),
        send_confirmation=sub.send(t.boolean()).reduce(
            {"event": {"name": "confirmation", "payload": g.inherit()}}
        ),
        # retry
        start_retry=sub.start(
            t.struct({"fail": t.boolean(), "timeout": t.boolean()})
        ).reduce({"name": "retryExample"}),
        # secret
        start_secret=sub.start(t.struct({}), secrets=["MY_SECRET"]).reduce(
            {"name": "secretsExample"}
        ),
        # input mutation
        start_mut=sub.start(
            t.struct(
                {
                    "items": t.list(
                        t.struct({"pos": t.integer(), "innerField": t.string()})
                    )
                }
            )
        ).reduce({"name": "accidentalInputMutation"}),
        # non-deterministic
        start_non_deterministic=sub.start(t.struct({})).reduce(
            {"name": "nonDeterministic"}
        ),
        **sub.internals(),
    )
