# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import os

from typegraph import Graph, t, typegraph
from typegraph.policy import Policy
from typegraph.runtimes.substantial import Backend, SubstantialRuntime, WorkflowFile


@typegraph()
def substantial_child_workflow(g: Graph):
    pub = Policy.public()

    backend = Backend.dev_memory()
    if "SUB_BACKEND" in os.environ:
        if os.environ["SUB_BACKEND"] == "fs":
            backend = Backend.dev_fs()
        elif os.environ["SUB_BACKEND"] == "redis":
            backend = Backend.redis("SUB_REDIS")

    file = (
        WorkflowFile.deno(file="child_workflow.ts", deps=["imports/common_types.ts"])
        .import_(["bumpPackage", "bumpAll"])
        .build()
    )

    sub = SubstantialRuntime(backend, [file])

    package = t.struct({"name": t.string(), "version": t.integer()}).rename("Package")

    g.expose(
        pub,
        # common
        stop=sub.stop(),
        results_raw=sub.query_results_raw(),  # bypass type hinting in favor of json string
        workers=sub.query_resources(),
        start=sub.start(t.struct({"packages": t.list(package)})).reduce(
            {"name": "bumpAll"},
        ),
        **sub.internals(),
    )
