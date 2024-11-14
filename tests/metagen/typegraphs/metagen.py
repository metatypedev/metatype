# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import asdict
from os import getenv
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.metagen import Metagen
from typegraph.runtimes.python import PythonRuntime
import json


@typegraph()
def example_metagen(g: Graph):
    python = PythonRuntime()
    pub = Policy.public()
    student = t.struct(
        {
            "id": t.integer(as_id=True),
            "name": t.string(),
            "peers": t.list(g.ref("Student")).optional(),
        },
        name="Student",
    )
    g.expose(
        pub,
        one=python.import_(
            t.struct({"name": t.string()}),
            t.list(student),
            module="./scripts/same_hit.py",
            name="fnOne",
        ),
        two=python.import_(
            t.struct({"name": t.string()}).rename("TwoInput"),
            t.string(),
            module="./scripts/same_hit.py",
            name="fnTwo",
        ),
        three=python.import_(
            t.struct({"name": t.string()}),
            student,
            module="other.py",
            name="three",
        ),
    )


tg = example_metagen
workspace_path = getenv("workspace_path")
target_name = getenv("target_name")
gen_config = json.loads(getenv("gen_config"))

metagen = Metagen(workspace_path, gen_config)
items = metagen.dry_run(tg, target_name, None)

print(json.dumps([asdict(it) for it in items], indent=2))
