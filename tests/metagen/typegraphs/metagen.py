# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from dataclasses import asdict
from os import getenv

from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.metagen import Metagen
from typegraph.runtimes.python import PythonRuntime


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
workspace_path = getenv("WORKSPACE_PATH")
target_name = getenv("TARGET_NAME")
gen_config = getenv("GEN_CONFIG")
assert workspace_path is not None and target_name is not None and gen_config is not None
gen_config = json.loads(gen_config)

metagen = Metagen(workspace_path, gen_config)
items = metagen.dry_run(tg, target_name, None)

print(json.dumps([asdict(it) for it in items], indent=2))
